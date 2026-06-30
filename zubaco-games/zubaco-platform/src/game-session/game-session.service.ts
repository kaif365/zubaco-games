import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { DeviceDetectionService } from '../anti-cheat/device-detection.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ScoreValidatorService } from './score-validator.service';
import { generateServerSeed, hashServerSeed, computeFinalSeed } from './seed-rng';
import { InputSignature } from './utils/input-analyzer';
import { MIN_SESSION_DURATION_MS, MAX_SESSION_DURATION_MS } from './constants';
import { GameType } from '.prisma/client';
import * as crypto from 'crypto';

const VALID_GAME_TYPES = new Set<string>(Object.values(GameType));

@Injectable()
export class GameSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiCheat: AntiCheatService,
    private readonly deviceDetection: DeviceDetectionService,
    private readonly leaderboard: LeaderboardService,
    private readonly scoreValidator: ScoreValidatorService,
  ) {}

  /**
   * Primary game session flow used by the mobile app WebView integration.
   * Now includes: risk check, concurrent session prevention, IP/device capture.
   */
  async startGame(userId: string, gameType: string, config: any, options?: {
    ipAddress?: string;
    deviceFingerprint?: string;
    deviceComponents?: any;
    clientSeed?: string;
  }) {
    // ─── Validate game type (reject unknown types cleanly, not at DB layer) ──
    if (!VALID_GAME_TYPES.has(gameType)) {
      throw new BadRequestException(`Unknown game type: ${gameType}`);
    }

    // ─── ANTI-CHEAT: Check if user is allowed to play ────────────
    const sessionCheck = await this.antiCheat.checkSessionAllowed(userId);
    if (!sessionCheck.allowed) {
      throw new ForbiddenException(sessionCheck.reason);
    }

    // ─── ANTI-CHEAT: Concurrent session prevention ───────────────
    await this.abandonPreviousSession(userId);

    // Track session start for rate limiting
    await this.antiCheat.trackSessionStart(userId);

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = options?.clientSeed || '';
    const numericSeed = computeFinalSeed(serverSeed, clientSeed, 0);

    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: gameType as GameType,
        mode: 'FREE_PLAY',
        server_seed: serverSeed,
        client_seed: clientSeed || null,
        config: config || {},
        ip_address: options?.ipAddress || null,
        device_fingerprint: options?.deviceFingerprint || null,
      },
    });

    // Update active session with real ID
    await this.antiCheat.registerActiveSession(userId, session.id);

    // ─── ANTI-CHEAT: Register device fingerprint ─────────────────
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
      gameSessionId: session.id,
      serverSeedHash,
      seed: numericSeed,
      startedAt: session.started_at,
      config: config || {},
    };
  }

  /**
   * Register a freshly created active session and abandon any prior open
   * session for the same user (single-active-session invariant shared by all
   * start paths). Returns nothing; safe to call before/after session creation.
   */
  private async abandonPreviousSession(userId: string): Promise<void> {
    const previousSession = await this.antiCheat.registerActiveSession(userId, 'pending');
    if (previousSession && previousSession !== 'pending') {
      await this.prisma.gameSession.updateMany({
        where: { id: previousSession, outcome: null },
        data: { outcome: 'ABANDONED', completed_at: new Date() },
      });
    }
  }

  /**
   * Start a tournament game session.
   * Config is ALWAYS loaded from the server-side StageGame level_config.
   * This ensures all players in the same tournament stage get identical game parameters.
   * Client-supplied config is IGNORED for fairness.
   */
  async startTournamentGame(userId: string, stageGameId: string, stageEntryId: string) {
    // ─── ANTI-CHEAT: Check if user is allowed to play ────────────
    const sessionCheck = await this.antiCheat.checkSessionAllowed(userId);
    if (!sessionCheck.allowed) {
      throw new ForbiddenException(sessionCheck.reason);
    }

    // Load the stage game to get the server-defined config
    const stageGame = await this.prisma.stageGame.findUnique({
      where: { id: stageGameId },
      include: { level_config: true, season_stage: true },
    });

    if (!stageGame) throw new NotFoundException('Stage game not found');

    // Verify stage is open
    if (stageGame.season_stage.status !== 'OPEN') {
      throw new ForbiddenException('This stage is not currently open');
    }

    // Verify user has a valid stage entry
    const stageEntry = await this.prisma.stageEntry.findFirst({
      where: { id: stageEntryId, season_stage_id: stageGame.season_stage_id, eliminated: false },
      include: { season_entry: true },
    });

    if (!stageEntry || stageEntry.season_entry.user_id !== userId) {
      throw new ForbiddenException('You are not eligible for this stage');
    }

    // Check if already played this game in this stage
    const existingSession = await this.prisma.gameSession.findFirst({
      where: {
        user_id: userId,
        stage_entry_id: stageEntryId,
        game_type: stageGame.game_type,
        outcome: { not: null },
      },
    });

    if (existingSession) {
      throw new ForbiddenException('You have already played this game in this stage');
    }

    // ─── ANTI-CHEAT: Concurrent session prevention ───────────────
    await this.abandonPreviousSession(userId);
    await this.antiCheat.trackSessionStart(userId);

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const numericSeed = computeFinalSeed(serverSeed);

    // Use ONLY the server-side level config - never trust client config
    const gameConfig = stageGame.level_config?.config || {};

    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: stageGame.game_type,
        mode: 'TOURNAMENT',
        level: stageGame.level_config ? undefined : stageGame.game_order,
        stage_entry_id: stageEntryId,
        server_seed: serverSeed,
        config: gameConfig, // Server-side config only
      },
    });

    // Register the active session so concurrency/heartbeat tracking applies
    await this.antiCheat.registerActiveSession(userId, session.id);

    return {
      gameSessionId: session.id,
      serverSeedHash,
      seed: numericSeed,
      gameType: stageGame.game_type,
      config: gameConfig, // Send config to client so game can render
      startedAt: session.started_at,
    };
  }

  /**
   * Get session state - used by game frontend to verify session
   */
  async getSessionState(sessionId: string, userId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        user_id: true,
        game_type: true,
        mode: true,
        level: true,
        server_seed: true,
        config: true,
        started_at: true,
        outcome: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.user_id !== userId) throw new ForbiddenException('Not your session');

    // Only reveal server_seed after game is completed (provable fairness)
    const { user_id, server_seed, ...rest } = session;
    return {
      ...rest,
      server_seed: session.outcome ? server_seed : undefined,
      server_seed_hash: crypto.createHash('sha256').update(server_seed).digest('hex'),
    };
  }

  /**
   * Submit game result - called by game frontend after play.
   * Now accepts: movesHash, inputSignature for anti-cheat analysis.
   */
  async submitResult(sessionId: string, userId: string, score: number, durationMs: number, metadata?: any, antiCheatData?: {
    movesHash?: string;
    inputSignature?: InputSignature;
  }) {
    // Hard reject obviously invalid values
    if (score < 0) throw new ForbiddenException('Invalid score');
    if (durationMs < MIN_SESSION_DURATION_MS) throw new ForbiddenException('Invalid duration');
    if (durationMs > MAX_SESSION_DURATION_MS) throw new ForbiddenException('Session timeout exceeded');

    // This path finalizes ONLY generic free-play sessions (mode FREE_PLAY with no
    // level). Tournament sessions are finalized exclusively by the tournament
    // engine and level-based sessions by the free-play engine — preventing
    // cross-engine finalization with divergent side effects.
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, user_id: userId, outcome: null, mode: 'FREE_PLAY', level: null },
    });

    if (!session) throw new NotFoundException('Active session not found');

    // Verify elapsed time is plausible (session must have started before now)
    const elapsed = Date.now() - new Date(session.started_at).getTime();
    if (durationMs > elapsed + 5000) {
      throw new ForbiddenException('Duration exceeds session age');
    }

    // Phase 2: Server-side score validation against game formula bounds
    const validationResult = this.scoreValidator.validateScore(
      session.game_type,
      session.config as Record<string, any>,
      score,
      durationMs,
    );

    if (!validationResult.valid) {
      throw new ForbiddenException(`Score rejected: ${validationResult.reason}`);
    }

    // Atomically claim the session (double-submit guard). Two concurrent submits
    // can no longer both pass the read above and double-process.
    const claimed = await this.prisma.gameSession.updateMany({
      where: { id: sessionId, user_id: userId, outcome: null, mode: 'FREE_PLAY', level: null },
      data: {
        score,
        duration_ms: durationMs,
        outcome: 'COMPLETED',
        completed_at: new Date(),
        metadata,
        moves_hash: antiCheatData?.movesHash || null,
        input_signature: antiCheatData?.inputSignature ? (antiCheatData.inputSignature as any) : null,
      },
    });

    if (claimed.count === 0) {
      throw new ConflictException('Session already completed');
    }

    // Clear active session lock
    await this.antiCheat.clearActiveSession(userId);

    // Phase 3: Run full anti-cheat analysis (non-blocking on failure)
    let flagsRaised = 0;
    try {
      // Verify heartbeats if game was long enough
      if (durationMs > 15000) {
        const hbResult = await this.antiCheat.verifyHeartbeats(sessionId, durationMs);
        if (!hbResult.valid && hbResult.flag) {
          // Store the heartbeat flag
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
          flagsRaised++;
        }
      }

      // Run main anti-cheat analysis (all 7 detection types)
      const cheatResult = await this.antiCheat.analyzeGameResult({
        userId,
        sessionId,
        score,
        durationMs,
        gameType: session.game_type,
        movesHash: antiCheatData?.movesHash,
        inputSignature: antiCheatData?.inputSignature,
        ipAddress: session.ip_address || undefined,
        deviceFingerprint: session.device_fingerprint || undefined,
        mode: session.mode,
        maxPossibleScore: validationResult.theoretical_max,
      });
      flagsRaised += cheatResult.flags_raised;
    } catch {
      // Anti-cheat failure should not block game completion
    }

    // Persist the best score to the durable per-game progress record so the
    // global leaderboard's DB source of truth stays complete for generic
    // free-play sessions too, then refresh the Redis ranking cache. Without the
    // DB write the Redis board and the DB fallback would diverge (LB-VAL-05).
    try {
      const existing = await this.prisma.gameProgress.findUnique({
        where: { user_id_game_type: { user_id: userId, game_type: session.game_type } },
        select: { best_score: true },
      });
      await this.prisma.gameProgress.upsert({
        where: { user_id_game_type: { user_id: userId, game_type: session.game_type } },
        create: { user_id: userId, game_type: session.game_type, best_score: score, total_plays: 1 },
        update: {
          total_plays: { increment: 1 },
          best_score: existing ? Math.max(existing.best_score, score) : score,
        },
      });
      await this.leaderboard.updateScore(userId, session.game_type, score);
    } catch {
      // Leaderboard/progress failure should not block game completion
    }

    return { success: true, score, flags_raised: flagsRaised };
  }
}
