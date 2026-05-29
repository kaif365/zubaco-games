import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { selectWordSet } from './engine/wordBank';
import { calculateScore, type GameConfig } from './engine/scorer';
import { getLevelConfig } from './engine/levelConfig';
import * as crypto from 'crypto';

const DEFAULT_CONFIG: GameConfig = { showDurationMs: 5000, timeLimitMs: 60000, groupSize: 3, totalGroups: 3, pointsPerGroup: 50, pointsPerPartialWord: 10, timeBonusMultiplier: 3 };

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(playerId: string, stageId: string, level?: number) {
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId } });
    const config: GameConfig = dbConfig ? { showDurationMs: dbConfig.showDurationMs, timeLimitMs: dbConfig.timeLimitMs, groupSize: dbConfig.groupSize, totalGroups: dbConfig.totalGroups, pointsPerGroup: dbConfig.pointsPerGroup, pointsPerPartialWord: dbConfig.pointsPerPartialWord, timeBonusMultiplier: dbConfig.timeBonusMultiplier } : DEFAULT_CONFIG;

    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      config.timeLimitMs = levelParams.timeLimitMs;
      config.totalGroups = levelParams.groupCount;
      config.groupSize = levelParams.itemsPerGroup;
    }

    const serverSeed = crypto.randomBytes(16).toString('hex');
    const clientSeed = crypto.randomBytes(8).toString('hex');
    const nonce = Math.floor(Math.random() * 100000);
    const session = await this.prisma.gameSession.create({ data: { playerId, stageId, serverSeed, clientSeed, nonce, status: 'active' } });
    const seed = computeFinalSeed(serverSeed, clientSeed, nonce);

    // Send shuffled words to client (they'll display for showDurationMs then vanish)
    const wordSet = selectWordSet(seed);
    const allWords = wordSet.groups.flatMap((g) => g.words);
    // Shuffle for display
    const rng = (await import('./engine/random')).mulberry32(seed + 999);
    const shuffled = [...allWords];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]; }

    return { gameSessionId: session.id, seed, config, serverTime: new Date().toISOString(), words: shuffled, endTime: new Date(Date.now() + config.timeLimitMs + 2000).toISOString(), level: levelParams?.level ?? 1, scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0 };
  }

  async submitGame(playerId: string, gameSessionId: string, playerGroups: string[][], clientScore: number) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session');
    if (session.status !== 'active') throw new BadRequestException('Already completed');

    const cheatReasons: string[] = [];
    const seed = computeFinalSeed(session.serverSeed, session.clientSeed, session.nonce);
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId: session.stageId } });
    const config: GameConfig = dbConfig ? { showDurationMs: dbConfig.showDurationMs, timeLimitMs: dbConfig.timeLimitMs, groupSize: dbConfig.groupSize, totalGroups: dbConfig.totalGroups, pointsPerGroup: dbConfig.pointsPerGroup, pointsPerPartialWord: dbConfig.pointsPerPartialWord, timeBonusMultiplier: dbConfig.timeBonusMultiplier } : DEFAULT_CONFIG;

    const maxEndTime = session.startedAt.getTime() + config.timeLimitMs + 5000;
    if (Date.now() > maxEndTime) throw new BadRequestException('Game session has expired');

    const wordSet = selectWordSet(seed);
    const elapsed = Date.now() - session.startedAt.getTime() - config.showDurationMs;
    const timeRemaining = Math.max(0, config.timeLimitMs - elapsed);
    const result = calculateScore(playerGroups, wordSet.groups, timeRemaining, config);

    if (Math.abs(clientScore - result.finalScore) > 10) {
      cheatReasons.push(`Score divergence: client=${clientScore}, server=${result.finalScore}`);
    }
    if (elapsed > config.timeLimitMs + 10000) {
      cheatReasons.push(`Time overflow`);
    }

    const status = cheatReasons.length > 0 ? 'flagged' : 'completed';
    if (cheatReasons.length > 0) await this.prisma.cheatFlag.createMany({ data: cheatReasons.map((reason) => ({ gameSessionId, reason })) });
    if (cheatReasons.length > 0) {
      void this.eventService.publishCheatFlagged(gameSessionId, playerId, session.stageId, cheatReasons.map((reason) => ({ reason, severity: 'warning' })));
    }
    const { count } = await this.prisma.gameSession.updateMany({ where: { id: gameSessionId, status: 'active' }, data: { status, clientScore, serverScore: result.finalScore, endedAt: new Date() } });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(gameSessionId, playerId, session.stageId, result.finalScore);

    return { finalScore: result.finalScore, status, correctGroups: result.correctGroupCount };
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
