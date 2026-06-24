import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { DeviceDetectionService } from '../anti-cheat/device-detection.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ScoreValidatorService } from './score-validator.service';
import { generateServerSeed, hashServerSeed, computeFinalSeed } from './seed-rng';
import { InputSignature } from './utils/input-analyzer';
import * as crypto from 'crypto';

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
  }) {
    // ─── ANTI-CHEAT: Check if user is allowed to play ────────────
    const sessionCheck = await this.antiCheat.checkSessionAllowed(userId);
    if (!sessionCheck.allowed) {
      throw new ForbiddenException(sessionCheck.reason);
    }

    // ─── ANTI-CHEAT: Concurrent session prevention ───────────────
    const previousSession = await this.antiCheat.registerActiveSession(userId, 'pending');
    if (previousSession && previousSession !== 'pending') {
      // Abandon the old session
      await this.prisma.gameSession.updateMany({
        where: { id: previousSession, outcome: null },
        data: { outcome: 'ABANDONED', completed_at: new Date() },
      });
    }

    // Track session start for rate limiting
    await this.antiCheat.trackSessionStart(userId);

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const numericSeed = computeFinalSeed(serverSeed);

    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: gameType as any,
        mode: 'FREE_PLAY',
        server_seed: serverSeed,
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
   * Start a tournament game session.
   * Config is ALWAYS loaded from the server-side StageGame level_config.
   * This ensures all players in the same tournament stage get identical game parameters.
   * Client-supplied config is IGNORED for fairness.
   */
  async startTournamentGame(userId: string, stageGameId: string, stageEntryId: string) {
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
    if (durationMs < 1000) throw new ForbiddenException('Invalid duration');
    if (durationMs > 1800000) throw new ForbiddenException('Session timeout exceeded'); // 30 min max

    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, user_id: userId, outcome: null },
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

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
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
      });
      flagsRaised += cheatResult.flags_raised;
    } catch {
      // Anti-cheat failure should not block game completion
    }

    // Update leaderboard
    try {
      await this.leaderboard.updateScore(userId, session.game_type, score);
    } catch {
      // Leaderboard failure should not block game completion
    }

    return { success: true, score: updated.score, flags_raised: flagsRaised };
  }
}
