import * as crypto from 'crypto';
import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { getLevelConfig } from './engine/levelConfig';

export interface StageConfig {
  gridSize: number;
  objectCount: number;
  memorizeTimeMs: number;
  recallTimeMs: number;
  pointsPerCorrect: number;
  timeBonusMultiplier: number;
}

interface PlacementInput {
  objectId: string;
  placedCellIndex: number;
  correctCellIndex: number;
  isCorrect: boolean;
}

const OBJECT_POOL = [
  'star', 'heart', 'diamond', 'moon', 'sun', 'flower', 'tree', 'mushroom',
  'apple', 'grape', 'fish', 'bird', 'cat', 'bolt', 'fire', 'snowflake',
];

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async fetchStageConfig(stageId: string): Promise<StageConfig> {
    const cfg = await this.prisma.gameConfiguration.findUnique({ where: { stageId } });
    if (!cfg) {
      return {
        gridSize: 4,
        objectCount: 6,
        memorizeTimeMs: 5000,
        recallTimeMs: 40000,
        pointsPerCorrect: 100,
        timeBonusMultiplier: 5,
      };
    }
    return {
      gridSize: cfg.gridSize,
      objectCount: cfg.objectCount,
      memorizeTimeMs: cfg.memorizeTimeMs,
      recallTimeMs: cfg.recallTimeMs,
      pointsPerCorrect: cfg.pointsPerCorrect,
      timeBonusMultiplier: cfg.timeBonusMultiplier,
    };
  }

  async startGame(userId: string, stageId: string, level?: number) {
    const existing = await this.prisma.gameSession.findUnique({
      where: { userId_stageId: { userId, stageId } },
    });
    if (existing && existing.status === 1) {
      throw new ConflictException('Active session already exists');
    }
    if (existing) {
      await this.prisma.gameSession.delete({ where: { id: existing.id } });
    }

    const stageConfig = await this.fetchStageConfig(stageId);
    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      stageConfig.gridSize = levelParams.gridSize;
      stageConfig.objectCount = levelParams.objectCount;
      stageConfig.memorizeTimeMs = levelParams.memorizeMs;
      stageConfig.recallTimeMs = levelParams.timeLimitMs;
    }
    const serverSeed = crypto.randomBytes(16).toString('hex');
    const seed = this.computeSeed(serverSeed, userId, 0);
    const endTime = new Date(Date.now() + stageConfig.memorizeTimeMs + stageConfig.recallTimeMs);

    const session = await this.prisma.gameSession.create({
      data: {
        userId,
        stageId,
        serverSeed,
        seed,
        status: 1,
        endTime,
        totalObjects: stageConfig.objectCount,
        snapshot: {
          create: {
            gridSize: stageConfig.gridSize,
            objectCount: stageConfig.objectCount,
            memorizeTimeMs: stageConfig.memorizeTimeMs,
            recallTimeMs: stageConfig.recallTimeMs,
            pointsPerCorrect: stageConfig.pointsPerCorrect,
            timeBonusMultiplier: stageConfig.timeBonusMultiplier,
          },
        },
      },
    });

    // Generate object types deterministically from seed
    const rng = this.mulberry32(seed);
    const shuffled = [...OBJECT_POOL].sort(() => rng() - 0.5);
    const objectTypes = shuffled.slice(0, stageConfig.objectCount);

    return {
      gameSessionId: session.id,
      endTime: endTime.toISOString(),
      serverTime: new Date().toISOString(),
      config: stageConfig,
      seed,
      objectTypes,
      level: levelParams?.level ?? 1,
      scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0,
    };
  }

  async submitResult(userId: string, gameSessionId: string, placements: PlacementInput[], clientScore: number) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: gameSessionId, userId, status: 1 },
      include: { snapshot: true },
    });
    if (!session) throw new NotFoundException('Active game session not found');

    const snapshot = session.snapshot;
    if (!snapshot) throw new NotFoundException('Session snapshot not found');

    // Enforce endTime
    if (session.endTime && Date.now() > session.endTime.getTime() + 5000) {
      throw new BadRequestException('Game session has expired');
    }

    // Limit placements to prevent DoS
    if (placements.length > 100) {
      throw new BadRequestException('Too many placements submitted');
    }

    // SERVER-SIDE VALIDATION: Regenerate board from seed and verify placements
    const rng = this.mulberry32(session.seed ?? 0);
    const totalCells = snapshot.gridSize * snapshot.gridSize;
    const objectCount = Math.min(snapshot.objectCount, totalCells, OBJECT_POOL.length);

    // Replicate boardGenerator logic: seededShuffle objects, seededShuffle cells
    const shuffledObjects = this.seededShuffle([...OBJECT_POOL], rng);
    const selectedObjects = shuffledObjects.slice(0, objectCount);

    const allCells = Array.from({ length: totalCells }, (_, i) => i);
    const shuffledCells = this.seededShuffle(allCells, rng);
    const selectedCells = shuffledCells.slice(0, objectCount);

    // Build correct placement map: objectId -> cellIndex
    const correctPlacements = new Map<string, number>();
    for (let i = 0; i < objectCount; i++) {
      correctPlacements.set(selectedObjects[i], selectedCells[i]);
    }

    // Validate each placement server-side (ignore client's isCorrect)
    let correctCount = 0;
    for (const p of placements) {
      const expectedCell = correctPlacements.get(p.objectId);
      if (expectedCell !== undefined && expectedCell === p.placedCellIndex) {
        correctCount++;
      }
    }

    const totalObjects = objectCount;
    const accuracy = totalObjects > 0 ? correctCount / totalObjects : 0;
    const baseScore = Math.round(accuracy * 100);

    const elapsed = Date.now() - session.startedAt.getTime() - snapshot.memorizeTimeMs;
    const remainingMs = Math.max(0, snapshot.recallTimeMs - elapsed);
    const timeBonus = Math.floor(snapshot.timeBonusMultiplier * (remainingMs / snapshot.recallTimeMs));
    const finalScore = baseScore + timeBonus;

    // Anti-cheat: score discrepancy
    const cheatFlags: { reason: string; severity: string }[] = [];
    const diff = Math.abs(clientScore - finalScore);
    if (diff > 20) {
      this.logger.warn(`Score discrepancy session=${gameSessionId}: client=${clientScore} server=${finalScore}`);
      await this.prisma.gameCheatFlag.create({
        data: {
          gameSessionId,
          userId,
          flagType: 1,
          evidence: { clientScore, serverScore: finalScore, diff },
        },
      });
      cheatFlags.push({ reason: `Score discrepancy: client=${clientScore} server=${finalScore}`, severity: 'warning' });
    }

    // Store inputs
    await this.prisma.gameInput.createMany({
      data: placements.map((p) => ({
        gameSessionId,
        objectId: p.objectId,
        placedCell: p.placedCellIndex,
        correctCell: p.correctCellIndex,
        isCorrect: p.isCorrect,
        clientTime: new Date(),
      })),
    });

    // Update session (atomic to prevent double-submit)
    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: gameSessionId, status: 1 },
      data: { status: 2, score: finalScore, correctPlacements: correctCount, endedAt: new Date() },
    });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(gameSessionId, userId, session.stageId, finalScore);
    if (cheatFlags.length > 0) {
      void this.eventService.publishCheatFlagged(gameSessionId, userId, session.stageId, cheatFlags);
    }

    return { finalScore, status: 'completed', correctCount, totalObjects };
  }

  async endGame(userId: string, gameSessionId: string, reason: string) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: gameSessionId, userId, status: 1 },
    });
    if (!session) throw new NotFoundException('Active game session not found');

    const statusMap: Record<string, number> = { timeout: 5, user_quit: 6, error: 3 };
    await this.prisma.gameSession.update({
      where: { id: gameSessionId },
      data: { status: statusMap[reason] ?? 6, endedAt: new Date() },
    });
    return { success: true };
  }

  private computeSeed(serverSeed: string, clientSeed: string, nonce: number): number {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash >>> 0;
  }

  private mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private seededShuffle<T>(arr: T[], rng: () => number): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
