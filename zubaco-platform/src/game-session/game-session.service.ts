import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class GameSessionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Primary game session flow used by the mobile app WebView integration.
   * Matches the contract: POST /UserContest/{key}/startGame
   */
  async startGame(userId: string, gameType: string, config: any) {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: gameType as any,
        mode: 'FREE_PLAY',
        server_seed: serverSeed,
        config: config || {},
      },
    });

    return {
      gameSessionId: session.id,
      serverSeedHash, // Give hash before game, reveal actual seed after
      startedAt: session.started_at,
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

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

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
   * Submit game result - called by game frontend after play
   */
  async submitResult(sessionId: string, userId: string, score: number, durationMs: number, metadata?: any) {
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

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        score,
        duration_ms: durationMs,
        outcome: 'COMPLETED',
        completed_at: new Date(),
        metadata,
      },
    });

    return { success: true, score: updated.score };
  }
}
