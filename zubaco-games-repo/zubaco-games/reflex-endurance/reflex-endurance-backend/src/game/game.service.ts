import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { validateTaps } from './engine/circleValidator';
import { analyzeInputTiming } from './engine/timingAnalyzer';
import { getLevelConfig } from './engine/levelConfig';
import * as crypto from 'crypto';

export interface GameConfig { timeLimitMs: number; initialSpawnIntervalMs: number; speedIncreaseEveryMs: number; speedMultiplier: number; maxWrongTaps: number; }
const DEFAULT_CONFIG: GameConfig = { timeLimitMs: 300000, initialSpawnIntervalMs: 1200, speedIncreaseEveryMs: 30000, speedMultiplier: 0.85, maxWrongTaps: 2 };

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(playerId: string, stageId: string, level?: number) {
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId } });
    const config: GameConfig = dbConfig ? { timeLimitMs: dbConfig.timeLimitMs, initialSpawnIntervalMs: dbConfig.initialSpawnIntervalMs, speedIncreaseEveryMs: dbConfig.speedIncreaseEveryMs, speedMultiplier: dbConfig.speedMultiplier, maxWrongTaps: dbConfig.maxWrongTaps } : DEFAULT_CONFIG;

    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      config.timeLimitMs = levelParams.timeLimitMs;
    }
    const serverSeed = crypto.randomBytes(16).toString('hex');
    const clientSeed = crypto.randomBytes(8).toString('hex');
    const nonce = Math.floor(Math.random() * 100000);
    const session = await this.prisma.gameSession.create({ data: { playerId, stageId, serverSeed, clientSeed, nonce, status: 'active' } });
    const seed = computeFinalSeed(serverSeed, clientSeed, nonce);
    return { gameSessionId: session.id, seed, config, serverTime: new Date().toISOString(), endTime: new Date(Date.now() + config.timeLimitMs + 2000).toISOString(), level: levelParams?.level ?? 1, scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0 };
  }

  async submitGame(playerId: string, gameSessionId: string, taps: { circleId: number; timestamp: number; correct: boolean }[], clientScore: number) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session');
    if (session.status !== 'active') throw new BadRequestException('Already completed');

    // Enforce max taps to prevent DoS
    if (taps.length > 2000) throw new BadRequestException('Too many taps submitted');

    const cheatReasons: string[] = [];

    // SERVER-SIDE VALIDATION: Regenerate circle sequence and verify each tap
    const seed = computeFinalSeed(session.serverSeed, session.clientSeed, session.nonce);
    // Estimate max circles: 5min / initial interval with speed increases
    const maxCircles = Math.ceil(DEFAULT_CONFIG.timeLimitMs / (DEFAULT_CONFIG.initialSpawnIntervalMs * 0.5));
    const { correctTaps, wrongTaps } = validateTaps(seed, taps, maxCircles);

    // Server score = correct taps (simple 1pt each)
    const serverScore = correctTaps;

    if (Math.abs(clientScore - serverScore) > 3) {
      cheatReasons.push(`Score divergence: client=${clientScore}, server=${serverScore}`);
    }
    if (wrongTaps > DEFAULT_CONFIG.maxWrongTaps) {
      cheatReasons.push(`Too many wrong taps: ${wrongTaps}`);
    }

    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed > DEFAULT_CONFIG.timeLimitMs + 5000) {
      throw new BadRequestException('Game session has expired');
    }

    // Timing analysis
    const timingResult = analyzeInputTiming(
      taps.map((t) => t.timestamp),
      { minAvgResponseMs: 120 },
    );
    if (timingResult.isSuspicious) {
      cheatReasons.push(timingResult.reason!);
    }

    const status = cheatReasons.length > 0 ? 'flagged' : 'completed';
    if (cheatReasons.length > 0) await this.prisma.cheatFlag.createMany({ data: cheatReasons.map((reason) => ({ gameSessionId, reason })) });
    if (cheatReasons.length > 0) {
      void this.eventService.publishCheatFlagged(gameSessionId, playerId, session.stageId, cheatReasons.map((reason) => ({ reason, severity: 'warning' })));
    }
    const { count } = await this.prisma.gameSession.updateMany({ where: { id: gameSessionId, status: 'active' }, data: { status, clientScore, serverScore, endedAt: new Date() } });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(gameSessionId, playerId, session.stageId, serverScore);

    return { finalScore: serverScore, status, correctTaps };
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
      where: { id: sessionId, status: 'active' },
      data: { status: 'expired' },
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
