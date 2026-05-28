import * as crypto from 'crypto';

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { generateChangeSchedule, validateTap } from './engine/changeValidator';
import { getLevelConfig } from './engine/levelConfig';

export interface StageConfig {
  timeLimit: number;
  gridSize: number;
  changeCount: number;
  changeIntervalMs: number;
  displayDurationMs: number;
  pointsPerCorrectTap: number;
  penaltyPerWrongTap: number;
  bonusTimeRatio: number;
}

interface TapInput {
  cellId: number;
  isCorrect: boolean;
  timestamp: number;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  /**
   * Fetch game configuration for a stage.
   */
  async fetchStageConfig(stageId: string): Promise<StageConfig> {
    const config = await this.prisma.gameConfiguration.findUnique({
      where: { stageId },
    });

    if (!config) {
      // Return sensible defaults if no config found
      return {
        timeLimit: 60000,
        gridSize: 4,
        changeCount: 12,
        changeIntervalMs: 3000,
        displayDurationMs: 2000,
        pointsPerCorrectTap: 20,
        penaltyPerWrongTap: 10,
        bonusTimeRatio: 10,
      };
    }

    return {
      timeLimit: config.timeLimit,
      gridSize: config.gridSize,
      changeCount: config.changeCount,
      changeIntervalMs: config.changeIntervalMs,
      displayDurationMs: config.displayDurationMs,
      pointsPerCorrectTap: config.pointsPerCorrectTap,
      penaltyPerWrongTap: config.penaltyPerWrongTap,
      bonusTimeRatio: config.bonusTimeRatio,
    };
  }

  /**
   * Start a new game session. Generates server seed for deterministic PRNG.
   */
  async startGame(userId: string, stageId: string, level?: number) {
    // Check for existing active session
    const existing = await this.prisma.gameSession.findUnique({
      where: { userId_stageId: { userId, stageId } },
    });

    if (existing && existing.status === 1) {
      throw new ConflictException('Active session already exists for this stage');
    }

    // Delete previous completed session if exists (one attempt per stage)
    if (existing) {
      await this.prisma.gameSession.delete({ where: { id: existing.id } });
    }

    const stageConfig = await this.fetchStageConfig(stageId);
    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      stageConfig.timeLimit = levelParams.timeLimitMs;
      stageConfig.gridSize = levelParams.gridSize;
      stageConfig.displayDurationMs = levelParams.displayMs;
      stageConfig.changeCount = levelParams.dotCount;
    }
    const serverSeed = crypto.randomBytes(16).toString('hex');
    const seed = this.computeSeed(serverSeed, userId, 0);
    const endTime = new Date(Date.now() + stageConfig.timeLimit);

    const session = await this.prisma.gameSession.create({
      data: {
        userId,
        stageId,
        serverSeed,
        seed,
        status: 1,
        endTime,
        totalChanges: stageConfig.changeCount,
        snapshot: {
          create: {
            timeLimit: stageConfig.timeLimit,
            gridSize: stageConfig.gridSize,
            changeCount: stageConfig.changeCount,
            changeIntervalMs: stageConfig.changeIntervalMs,
            displayDurationMs: stageConfig.displayDurationMs,
            pointsPerCorrectTap: stageConfig.pointsPerCorrectTap,
            penaltyPerWrongTap: stageConfig.penaltyPerWrongTap,
            bonusTimeRatio: stageConfig.bonusTimeRatio,
          },
        },
      },
    });

    return {
      gameSessionId: session.id,
      endTime: endTime.toISOString(),
      serverTime: new Date().toISOString(),
      config: stageConfig,
      seed,
      roundNumber: 1,
      level: levelParams?.level ?? 1,
      scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0,
    };
  }

  /**
   * Validate and score player taps. This is SERVER-AUTHORITATIVE scoring.
   * The server regenerates the same changes using the same seed and validates
   * each tap against the expected change schedule.
   */
  async submitResult(userId: string, gameSessionId: string, taps: TapInput[], clientScore: number) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: gameSessionId, userId, status: 1 },
      include: { snapshot: true },
    });

    if (!session) {
      throw new NotFoundException('Active game session not found');
    }

    const snapshot = session.snapshot;
    if (!snapshot) {
      throw new NotFoundException('Session snapshot not found');
    }

    // Enforce endTime
    if (session.endTime && Date.now() > session.endTime.getTime() + 5000) {
      throw new BadRequestException('Game session has expired');
    }

    // Limit tap count to prevent DoS
    if (taps.length > 500) {
      throw new BadRequestException('Too many taps submitted');
    }

    // SERVER-SIDE VALIDATION: Regenerate change schedule from seed
    const changes = generateChangeSchedule({
      gridSize: snapshot.gridSize,
      changeCount: snapshot.changeCount,
      changeIntervalMs: snapshot.changeIntervalMs,
      displayDurationMs: snapshot.displayDurationMs,
      seed: session.seed ?? 0,
    });

    // Validate each tap against the regenerated schedule
    const gameStartTime = session.startedAt.getTime();
    let correctTaps = 0;
    let wrongTaps = 0;

    for (const tap of taps) {
      const tapTimeRelative = tap.timestamp - gameStartTime;
      const isActuallyCorrect = validateTap(tap.cellId, tapTimeRelative, changes);
      if (isActuallyCorrect) {
        correctTaps++;
      } else {
        wrongTaps++;
      }
    }

    const timeElapsed = Date.now() - gameStartTime;
    const timeRemainingMs = Math.max(0, snapshot.timeLimit - timeElapsed);

    const baseScore = correctTaps * snapshot.pointsPerCorrectTap;
    const penalty = wrongTaps * snapshot.penaltyPerWrongTap;
    const timeBonus = Math.floor(snapshot.bonusTimeRatio * (timeRemainingMs / 1000));
    const finalScore = Math.max(0, baseScore - penalty + timeBonus);

    // Anti-cheat: flag if client score deviates significantly
    const scoreDiff = Math.abs(clientScore - finalScore);
    if (scoreDiff > finalScore * 0.2 && scoreDiff > 50) {
      this.logger.warn(
        `Score discrepancy detected for session ${gameSessionId}: client=${clientScore} server=${finalScore}`,
      );
      await this.prisma.gameCheatFlag.create({
        data: {
          gameSessionId,
          userId,
          flagType: 1, // SCORE_DISCREPANCY
          evidence: { clientScore, serverScore: finalScore, diff: scoreDiff },
        },
      });
    }

    // Anti-cheat: check for impossibly fast taps
    const cheatFlags: { reason: string; severity: string }[] = [];
    if (scoreDiff > finalScore * 0.2 && scoreDiff > 50) {
      cheatFlags.push({ reason: `Score discrepancy: client=${clientScore} server=${finalScore}`, severity: 'critical' });
    }
    for (let i = 1; i < taps.length; i++) {
      const gap = taps[i].timestamp - taps[i - 1].timestamp;
      if (gap < 100) {
        // Less than 100ms between taps is suspicious
        await this.prisma.gameCheatFlag.create({
          data: {
            gameSessionId,
            userId,
            flagType: 2, // RAPID_INPUT
            evidence: { tapIndex: i, gap, threshold: 100 },
          },
        });
        cheatFlags.push({ reason: `Rapid input: ${gap}ms gap at tap ${i}`, severity: 'warning' });
        break;
      }
    }
    if (cheatFlags.length > 0) {
      void this.eventService.publishCheatFlagged(gameSessionId, userId, session.stageId, cheatFlags);
    }

    // Store all inputs
    await this.prisma.gameInput.createMany({
      data: taps.map((tap) => ({
        gameSessionId,
        cellId: tap.cellId,
        isCorrect: tap.isCorrect,
        clientTime: new Date(tap.timestamp),
      })),
    });

    // Update session to completed (atomic to prevent double-submit)
    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: gameSessionId, status: 1 },
      data: {
        status: 2,
        score: finalScore,
        correctTaps,
        wrongTaps,
        endedAt: new Date(),
      },
    });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(gameSessionId, userId, session.stageId, finalScore);

    return { finalScore, status: 'completed' };
  }

  /**
   * End game session manually (user quit, timeout, error).
   */
  async endGame(userId: string, gameSessionId: string, reason: string) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: gameSessionId, userId, status: 1 },
    });

    if (!session) {
      throw new NotFoundException('Active game session not found');
    }

    const statusMap: Record<string, number> = {
      timeout: 5,
      user_quit: 6,
      error: 3,
    };

    await this.prisma.gameSession.update({
      where: { id: gameSessionId },
      data: {
        status: statusMap[reason] ?? 6,
        endedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Get current session status.
   */
  async getSessionStatus(userId: string, stageId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { userId_stageId: { userId, stageId } },
      select: { id: true, status: true, score: true, startedAt: true, endedAt: true },
    });

    if (!session) return null;
    return session;
  }

  /**
   * Compute deterministic seed from server seed + userId + nonce.
   * Must match the frontend computeFinalSeed implementation exactly.
   */
  private computeSeed(serverSeed: string, clientSeed: string, nonce: number): number {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash >>> 0;
  }

  // ── Restate helpers ───────────────────────────────────────────────────

  buildResumeResponse(session: { sessionId: string; expiryAtMs: number; finalSeed: number }) {
    return {
      gameSessionId: session.sessionId,
      endTime: new Date(session.expiryAtMs).toISOString(),
      serverTime: new Date().toISOString(),
      seed: session.finalSeed,
      resumed: true,
    };
  }

  async expireSession(sessionId: string) {
    await this.prisma.gameSession.updateMany({
      where: { id: sessionId, status: 1 },
      data: { status: 5 },
    });
  }

  async scheduleExpiry(sessionId: string, expiryAtMs: number) {
    const ingressUrl = process.env.RESTATE_INGRESS_URL;
    if (!ingressUrl) return;
    const delayMs = Math.max(0, expiryAtMs - Date.now());
    const { scheduleExpiryViaRestate } = await import('../restate/game-expiry.service');
    await scheduleExpiryViaRestate(ingressUrl, sessionId, `${sessionId}`, delayMs);
  }
}
