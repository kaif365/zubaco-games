import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AgeVerificationService } from '../compliance/age-verification.service';
import { ScoringService } from '../scoring/scoring.service';
import { PuzzleService } from '../rng/puzzle.service';
import { WebhookService } from '../webhook/webhook.service';
import { GameType } from '.prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly ageVerification: AgeVerificationService,
    private readonly scoring: ScoringService,
    private readonly puzzle: PuzzleService,
    private readonly webhook: WebhookService,
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
    if (season.status !== 'REGISTRATION' && season.status !== 'ACTIVE') {
      throw new BadRequestException('Season registration is closed');
    }

    // Check if already registered
    const existing = await this.prisma.seasonEntry.findUnique({
      where: { user_id_season_id: { user_id: userId, season_id: seasonId } },
    });
    if (existing) throw new ConflictException('Already registered for this season');

    // Check max players
    if (season.max_players) {
      const count = await this.prisma.seasonEntry.count({ where: { season_id: seasonId } });
      if (count >= season.max_players) {
        throw new BadRequestException('Season is full');
      }
    }

    // Deduct entry fee if applicable
    if (season.entry_fee && Number(season.entry_fee) > 0) {
      // Age verification required for paid tournaments
      await this.ageVerification.ensureAgeVerified(userId);
      await this.walletService.deductEntryFee(userId, seasonId, Number(season.entry_fee));
    }

    // Assign to cohort (round-robin)
    const cohort = await this.assignCohort(seasonId);

    const entry = await this.prisma.seasonEntry.create({
      data: {
        user_id: userId,
        season_id: seasonId,
        cohort_id: cohort?.id,
      },
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

  async startTournamentGame(userId: string, seasonId: string, stageNumber: number, gameOrder: number) {
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

    // Create session
    const serverSeed = crypto.randomBytes(32).toString('hex');

    // Deterministically generate a server-authored board for validatable puzzles.
    const generated = this.puzzle.generate(stageGame.game_type, serverSeed, config);
    const clientConfig = generated ? { ...config, server_board: generated.board } : config;

    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: stageGame.game_type,
        mode: 'TOURNAMENT',
        stage_entry_id: stageEntry.id,
        server_seed: serverSeed,
        config: clientConfig,
        metadata: generated
          ? { _puzzle: { solution: generated.solution, fingerprint: generated.fingerprint, meta: generated.meta } }
          : undefined,
      },
    });

    return {
      session_id: session.id,
      game_type: stageGame.game_type,
      server_seed: serverSeed,
      config: clientConfig,
    };
  }

  // ─── SUBMIT TOURNAMENT GAME RESULT ─────────────────────────────

  async submitTournamentResult(
    userId: string,
    sessionId: string,
    score: number,
    durationMs: number,
    metadata?: any,
  ) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, user_id: userId, mode: 'TOURNAMENT', outcome: null },
      include: { stage_entry: true },
    });

    if (!session) throw new NotFoundException('Tournament session not found or already completed');

    // ── Deterministic puzzle validation ───────────────────────────
    const storedPuzzle = (session.metadata as any)?._puzzle;
    let boardTampered = false;
    const scoringMeta = { ...(metadata || {}) };
    if (storedPuzzle) {
      if (storedPuzzle.meta?.shortest_path && Array.isArray(scoringMeta.rounds)) {
        scoringMeta.rounds = scoringMeta.rounds.map((r: any) => ({
          ...r,
          shortestPath: r.shortestPath ?? storedPuzzle.meta.shortest_path,
        }));
      }
      if (metadata?.board_fingerprint) {
        boardTampered = metadata.board_fingerprint !== storedPuzzle.fingerprint;
      }
    }

    // ── Server-authoritative scoring (the only score that counts toward
    //    elimination). The client-claimed score is never trusted. ──
    const claimedScore = typeof score === 'number' ? score : null;
    const result = this.scoring.score(session.game_type, scoringMeta, session.config);
    const authoritativeScore = boardTampered
      ? 0
      : result.validated
      ? result.score
      : Math.max(0, Math.min(claimedScore ?? 0, result.maxScore));
    score = authoritativeScore;

    const discrepancy =
      claimedScore !== null && result.validated ? Math.abs(claimedScore - result.score) : 0;
    const flagged = boardTampered || !result.validated || discrepancy > Math.max(10, result.maxScore * 0.1);

    // Update session
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        score: authoritativeScore,
        max_score: result.maxScore,
        duration_ms: durationMs,
        outcome: boardTampered ? 'DISQUALIFIED' : 'COMPLETED',
        completed_at: new Date(),
        metadata: {
          ...(metadata || {}),
          ...(storedPuzzle ? { _puzzle: storedPuzzle } : {}),
          _scoring: {
            claimed_score: claimedScore,
            server_score: result.score,
            max_score: result.maxScore,
            validated: result.validated,
            breakdown: result.breakdown,
            discrepancy,
            board_tampered: boardTampered,
            flagged,
          },
        },
      },
    });

    // Update stage entry totals
    if (session.stage_entry) {
      await this.prisma.stageEntry.update({
        where: { id: session.stage_entry.id },
        data: {
          total_score: { increment: score },
          total_time_ms: { increment: durationMs },
          games_played: { increment: 1 },
        },
      });

      // Check if all 4 games completed
      const stageEntry = await this.prisma.stageEntry.findUnique({
        where: { id: session.stage_entry.id },
        include: { season_stage: { include: { stage_games: true } } },
      });

      if (stageEntry && stageEntry.games_played >= stageEntry.season_stage.stage_games.length) {
        await this.prisma.stageEntry.update({
          where: { id: stageEntry.id },
          data: { completed_at: new Date() },
        });
      }
    }

    // Notify the Base Platform of the validated result (durable, signed, async).
    await this.webhook.emitGameResult({
      session_id: session.id,
      user_id: userId,
      game_type: session.game_type as any,
      mode: 'TOURNAMENT',
      score: authoritativeScore,
      max_score: result.maxScore,
      duration_ms: durationMs,
      outcome: boardTampered ? 'DISQUALIFIED' : 'COMPLETED',
      stage_entry_id: session.stage_entry_id,
      level: session.level,
      flagged,
      validated: result.validated,
      completed_at: new Date().toISOString(),
    });

    return { score, total_score: (session.stage_entry?.total_score || 0) + score };
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  private async assignCohort(seasonId: string) {
    const cohorts = await this.prisma.cohort.findMany({
      where: { season_id: seasonId },
      include: { _count: { select: { entries: true } } },
    });

    if (cohorts.length === 0) return null;

    // Find cohort with fewest players
    cohorts.sort((a, b) => a._count.entries - b._count.entries);
    const target = cohorts[0];

    if (target._count.entries >= target.max_players) {
      // All cohorts full — create a new one
      return this.prisma.cohort.create({
        data: {
          season_id: seasonId,
          name: `Cohort ${cohorts.length + 1}`,
        },
      });
    }

    return target;
  }
}
