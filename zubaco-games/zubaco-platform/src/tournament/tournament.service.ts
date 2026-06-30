import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AgeVerificationService } from '../compliance/age-verification.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ScoreValidatorService } from '../game-session/score-validator.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { DeviceDetectionService } from '../anti-cheat/device-detection.service';
import { TournamentEventsService } from './tournament-events.service';
import { generateServerSeed, hashServerSeed } from '../game-session/seed-rng';
import { MIN_SESSION_DURATION_MS, MAX_SESSION_DURATION_MS } from '../game-session/constants';
import { GameType, Prisma } from '.prisma/client';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly ageVerification: AgeVerificationService,
    private readonly leaderboardService: LeaderboardService,
    private readonly scoreValidator: ScoreValidatorService,
    private readonly antiCheat: AntiCheatService,
    private readonly deviceDetection: DeviceDetectionService,
    private readonly events: TournamentEventsService,
  ) {}

  // ─── LIST ACTIVE SEASONS ───────────────────────────────────────

  async getActiveSeasons() {
    return this.prisma.season.findMany({
      where: { status: { in: ['REGISTRATION', 'ACTIVE'] } },
      include: {
        stages: {
          orderBy: { stage_number: 'asc' },
          include: { stage_games: true },
        },
        _count: { select: { entries: true } },
      },
      orderBy: { start_date: 'asc' },
    });
  }

  // ─── REGISTER FOR SEASON ───────────────────────────────────────

  async registerForSeason(userId: string, seasonId: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('Season not found');
    // Registration is only permitted while the season is in the REGISTRATION
    // window. Allowing it during ACTIVE let players join mid-tournament and skip
    // prior eliminations (fairness defect).
    if (season.status !== 'REGISTRATION') {
      throw new BadRequestException('Season registration is closed');
    }

    // Fast-path duplicate check (authoritatively re-checked inside the locked tx)
    const existing = await this.prisma.seasonEntry.findUnique({
      where: { user_id_season_id: { user_id: userId, season_id: seasonId } },
    });
    if (existing) throw new ConflictException('Already registered for this season');

    const entryFee = season.entry_fee ? Number(season.entry_fee) : 0;
    // Age verification required for paid tournaments (do this before opening the tx)
    if (entryFee > 0) {
      await this.ageVerification.ensureAgeVerified(userId);
    }

    // Atomic registration: lock the season row so capacity checks, the entry-fee
    // debit, cohort assignment and entry creation are serialized and all-or-nothing.
    const { entry, cohort } = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(`SELECT id FROM "seasons" WHERE id = $1 FOR UPDATE`, seasonId);

      // Authoritative duplicate check under the lock
      const dup = await tx.seasonEntry.findUnique({
        where: { user_id_season_id: { user_id: userId, season_id: seasonId } },
      });
      if (dup) throw new ConflictException('Already registered for this season');

      // Capacity check under the lock (prevents max_players over-fill race)
      if (season.max_players) {
        const count = await tx.seasonEntry.count({ where: { season_id: seasonId } });
        if (count >= season.max_players) {
          throw new BadRequestException('Season is full');
        }
      }

      // Entry-fee debit is atomic with entry creation (rolls back together on failure)
      if (entryFee > 0) {
        await this.walletService.deductEntryFeeTx(tx, userId, seasonId, entryFee);
      }

      // Cohort assignment is serialized by the season row lock (no duplicate
      // overflow cohorts, no over-fill).
      const assignedCohort = await this.assignCohortTx(tx, seasonId);

      const created = await tx.seasonEntry.create({
        data: {
          user_id: userId,
          season_id: seasonId,
          cohort_id: assignedCohort?.id,
        },
      });

      return { entry: created, cohort: assignedCohort };
    });

    this.events.emit('tournament.registered', seasonId, {
      userId,
      entryId: entry.id,
      cohortId: cohort?.id ?? null,
    });

    return { entry_id: entry.id, season: season.name, cohort: cohort?.name || null };
  }

  // ─── GET MY SEASON STATUS ──────────────────────────────────────

  async getMySeasonStatus(userId: string, seasonId: string) {
    const entry = await this.prisma.seasonEntry.findUnique({
      where: { user_id_season_id: { user_id: userId, season_id: seasonId } },
      include: {
        season: { include: { stages: { orderBy: { stage_number: 'asc' } } } },
        stage_entries: {
          include: {
            season_stage: true,
            game_sessions: {
              select: { id: true, game_type: true, score: true, duration_ms: true, outcome: true },
            },
          },
          orderBy: { season_stage: { stage_number: 'asc' } },
        },
      },
    });

    if (!entry) throw new NotFoundException('Not registered for this season');

    return {
      status: entry.status,
      season: entry.season,
      stages: entry.stage_entries,
    };
  }

  // ─── START TOURNAMENT GAME ─────────────────────────────────────

  async startTournamentGame(
    userId: string,
    seasonId: string,
    stageNumber: number,
    gameOrder: number,
    options?: { ipAddress?: string; deviceFingerprint?: string; deviceComponents?: any },
  ) {
    // ─── ANTI-CHEAT: Check if user is allowed to play ────────────
    const sessionCheck = await this.antiCheat.checkSessionAllowed(userId);
    if (!sessionCheck.allowed) {
      throw new ForbiddenException(sessionCheck.reason);
    }

    // Verify entry
    const entry = await this.prisma.seasonEntry.findUnique({
      where: { user_id_season_id: { user_id: userId, season_id: seasonId } },
    });
    if (!entry) throw new NotFoundException('Not registered for this season');
    if (entry.status === 'ELIMINATED') throw new BadRequestException('You have been eliminated');

    // Get stage
    const stage = await this.prisma.seasonStage.findUnique({
      where: { season_id_stage_number: { season_id: seasonId, stage_number: stageNumber } },
      include: { stage_games: { orderBy: { game_order: 'asc' } } },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.status !== 'OPEN') throw new BadRequestException('Stage is not open');

    // Get stage game
    const stageGame = stage.stage_games.find((g) => g.game_order === gameOrder);
    if (!stageGame) throw new NotFoundException('Game not found in this stage');

    // Get/create stage entry
    let stageEntry = await this.prisma.stageEntry.findUnique({
      where: { season_entry_id_season_stage_id: { season_entry_id: entry.id, season_stage_id: stage.id } },
    });

    if (!stageEntry) {
      stageEntry = await this.prisma.stageEntry.create({
        data: { season_entry_id: entry.id, season_stage_id: stage.id },
      });
    }

    // Check if already played this game in this stage
    const existingSession = await this.prisma.gameSession.findFirst({
      where: {
        user_id: userId,
        stage_entry_id: stageEntry.id,
        game_type: stageGame.game_type,
        outcome: 'COMPLETED',
      },
    });
    if (existingSession) throw new ConflictException('Already played this game in this stage');

    // Get level config for this stage-game difficulty
    let config: any = { time_limit: 180, max_score: 100 };
    if (stageGame.level_config_id) {
      const lc = await this.prisma.levelConfig.findUnique({ where: { id: stageGame.level_config_id } });
      if (lc) config = lc.config;
    }

    // Concurrent-session prevention (single active session per user).
    const previousSession = await this.antiCheat.registerActiveSession(userId, 'pending');
    if (previousSession && previousSession !== 'pending') {
      await this.prisma.gameSession.updateMany({
        where: { id: previousSession, outcome: null },
        data: { outcome: 'ABANDONED', completed_at: new Date() },
      });
    }
    await this.antiCheat.trackSessionStart(userId);

    // Create session with a committed server seed (raw seed is revealed only
    // after completion via session state — provable fairness).
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: stageGame.game_type,
        mode: 'TOURNAMENT',
        stage_entry_id: stageEntry.id,
        server_seed: serverSeed,
        config,
        ip_address: options?.ipAddress || null,
        device_fingerprint: options?.deviceFingerprint || null,
      },
    });

    await this.antiCheat.registerActiveSession(userId, session.id);

    // ─── ANTI-CHEAT: Register device fingerprint (ACHEAT-VAL-07) ──
    if (options?.deviceFingerprint) {
      try {
        await this.deviceDetection.upsertFingerprint(
          userId,
          options.deviceFingerprint,
          options.deviceComponents,
        );
      } catch { /* non-blocking */ }
    }

    return {
      session_id: session.id,
      game_type: stageGame.game_type,
      server_seed_hash: serverSeedHash,
      config,
    };
  }

  // ─── SUBMIT TOURNAMENT GAME RESULT ─────────────────────────────

  async submitTournamentResult(userId: string, sessionId: string, score: number, durationMs: number) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, user_id: userId, mode: 'TOURNAMENT', outcome: null },
      include: {
        stage_entry: {
          include: { season_stage: { include: { stage_games: true } } },
        },
      },
    });

    if (!session) throw new NotFoundException('Tournament session not found or already completed');

    // Hard bounds + plausibility (mirrors the free-play submit path)
    if (score < 0) throw new BadRequestException('Invalid score');
    if (durationMs < MIN_SESSION_DURATION_MS) throw new BadRequestException('Invalid duration');
    if (durationMs > MAX_SESSION_DURATION_MS) throw new BadRequestException('Session timeout exceeded');
    const elapsed = Date.now() - new Date(session.started_at).getTime();
    if (durationMs > elapsed + 5000) {
      throw new ForbiddenException('Duration exceeds session age');
    }

    const stage = session.stage_entry?.season_stage;
    if (!session.stage_entry || !stage) {
      throw new BadRequestException('Tournament session is not linked to a stage');
    }

    // Reject submissions once the stage is no longer open or its close time has
    // passed — otherwise late results could mutate already-ranked entries.
    if (stage.status !== 'OPEN') {
      throw new BadRequestException('Stage is closed; submissions are no longer accepted');
    }
    if (stage.close_date && new Date(stage.close_date) <= new Date()) {
      throw new BadRequestException('Stage close time has passed; submission rejected');
    }

    // Server-side score validation against the game's theoretical bounds.
    const validation = this.scoreValidator.validateScore(
      session.game_type,
      session.config as Record<string, any>,
      score,
      durationMs,
    );
    if (!validation.valid) {
      throw new ForbiddenException(`Score rejected: ${validation.reason}`);
    }

    const stageEntryId = session.stage_entry.id;
    const totalGames = stage.stage_games.length;

    // Atomic submit: claim the session (double-submit guard) and update the
    // stage-entry totals in a single transaction.
    const updatedStageEntry = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.gameSession.updateMany({
        where: { id: sessionId, user_id: userId, mode: 'TOURNAMENT', outcome: null },
        data: { score, duration_ms: durationMs, outcome: 'COMPLETED', completed_at: new Date() },
      });
      if (claimed.count === 0) {
        throw new ConflictException('Tournament session already completed');
      }

      const entry = await tx.stageEntry.update({
        where: { id: stageEntryId },
        data: {
          total_score: { increment: score },
          total_time_ms: { increment: durationMs },
          games_played: { increment: 1 },
        },
      });

      if (totalGames > 0 && entry.games_played >= totalGames && !entry.completed_at) {
        return tx.stageEntry.update({
          where: { id: entry.id },
          data: { completed_at: new Date() },
        });
      }

      return entry;
    });

    // Update real-time Redis leaderboard (non-blocking)
    try {
      await this.leaderboardService.updateStageScore(
        stage.id,
        userId,
        updatedStageEntry.total_score,
        updatedStageEntry.total_time_ms,
      );
    } catch {
      // Leaderboard failure should not block submission persistence
    }

    // Run anti-cheat analysis on the money-bearing tournament result (non-blocking)
    try {
      await this.antiCheat.clearActiveSession(userId);

      // Verify heartbeats for long sessions — consistent with the free-play and
      // generic submit paths.
      if (durationMs > 15000) {
        const hbResult = await this.antiCheat.verifyHeartbeats(sessionId, durationMs);
        if (!hbResult.valid && hbResult.flag) {
          await this.prisma.cheatFlag.create({
            data: {
              user_id: userId,
              session_id: sessionId,
              game_type: session.game_type,
              flag_type: hbResult.flag.type,
              severity: hbResult.flag.severity,
              details: hbResult.flag.details,
            },
          });
        }
      }

      await this.antiCheat.analyzeGameResult({
        userId,
        sessionId,
        score,
        durationMs,
        gameType: session.game_type,
        ipAddress: session.ip_address || undefined,
        deviceFingerprint: session.device_fingerprint || undefined,
        mode: session.mode,
        maxPossibleScore: validation.theoretical_max,
      });
    } catch {
      // Anti-cheat failure should not block submission persistence
    }

    return { score, total_score: updatedStageEntry.total_score };
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  private async assignCohortTx(tx: Prisma.TransactionClient, seasonId: string) {
    const cohorts = await tx.cohort.findMany({
      where: { season_id: seasonId },
      include: { _count: { select: { entries: true } } },
    });

    if (cohorts.length === 0) return null;

    // Find cohort with fewest players
    cohorts.sort((a, b) => a._count.entries - b._count.entries);
    const target = cohorts[0];

    if (target._count.entries >= target.max_players) {
      // All cohorts full — create a new one. Safe under the season row lock held
      // by the caller (no duplicate overflow cohorts).
      return tx.cohort.create({
        data: {
          season_id: seasonId,
          name: `Cohort ${cohorts.length + 1}`,
        },
      });
    }

    return target;
  }
}
