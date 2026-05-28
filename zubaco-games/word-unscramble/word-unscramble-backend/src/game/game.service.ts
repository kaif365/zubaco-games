import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { generateWords } from './engine/wordBank';
import { calculateScore, type WordAnswer, type StageConfig } from './engine/scorer';
import { analyzeInputTiming } from './engine/timingAnalyzer';
import { getLevelConfig } from './engine/levelConfig';
import * as crypto from 'crypto';

const DEFAULT_CONFIG: StageConfig = {
  totalWords: 15,
  wordTimeMs: 6000,
  timeLimitMs: 90000,
  pointsPerWord: 15,
  timeBonusPerSecond: 1,
};

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(playerId: string, stageId: string, level?: number) {
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId } });
    const config: StageConfig = dbConfig
      ? {
          totalWords: dbConfig.totalWords,
          wordTimeMs: dbConfig.wordTimeMs,
          timeLimitMs: dbConfig.timeLimitMs,
          pointsPerWord: dbConfig.pointsPerWord,
          timeBonusPerSecond: dbConfig.timeBonusPerSecond,
        }
      : DEFAULT_CONFIG;

    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      config.timeLimitMs = levelParams.timeLimitMs;
      config.totalWords = levelParams.wordCount;
    }

    const serverSeed = crypto.randomBytes(16).toString('hex');
    const clientSeed = crypto.randomBytes(8).toString('hex');
    const nonce = Math.floor(Math.random() * 100000);

    const session = await this.prisma.gameSession.create({
      data: { playerId, stageId, serverSeed, clientSeed, nonce, status: 'active' },
    });

    const seed = computeFinalSeed(serverSeed, clientSeed, nonce);
    const endTime = new Date(Date.now() + config.timeLimitMs + 5000);

    return {
      gameSessionId: session.id,
      endTime: endTime.toISOString(),
      serverTime: new Date().toISOString(),
      config,
      seed,
      level: levelParams?.level ?? 1,
      scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0,
    };
  }

  async submitGame(
    playerId: string,
    gameSessionId: string,
    answers: WordAnswer[],
    clientScore: number,
  ) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session');
    if (session.status !== 'active') throw new BadRequestException('Session already completed');

    const cheatReasons: string[] = [];

    // Regenerate words server-side
    const seed = computeFinalSeed(session.serverSeed, session.clientSeed, session.nonce);
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId: session.stageId } });
    const config: StageConfig = dbConfig
      ? {
          totalWords: dbConfig.totalWords,
          wordTimeMs: dbConfig.wordTimeMs,
          timeLimitMs: dbConfig.timeLimitMs,
          pointsPerWord: dbConfig.pointsPerWord,
          timeBonusPerSecond: dbConfig.timeBonusPerSecond,
        }
      : DEFAULT_CONFIG;

    const maxEndTime = session.startedAt.getTime() + config.timeLimitMs + 5000;
    if (Date.now() > maxEndTime) throw new BadRequestException('Game session has expired');

    const words = generateWords(seed, config.totalWords);

    // Verify each answer
    const verifiedAnswers: WordAnswer[] = answers.map((a) => {
      const word = words[a.wordIndex];
      if (!word) return { ...a, solved: false };

      if (a.solved) {
        // Verify the selected order actually spells the word
        const builtWord = a.selectedOrder.map((i) => word.scrambled[i]).join('');
        if (builtWord !== word.word) {
          cheatReasons.push(`Word ${a.wordIndex}: client claims solved but order is wrong`);
          return { ...a, solved: false };
        }
      }
      return a;
    });

    // Calculate server score
    const serverResult = calculateScore(verifiedAnswers, config);

    // Score divergence
    if (Math.abs(clientScore - serverResult.finalScore) > 0) {
      cheatReasons.push(`Score divergence: client=${clientScore}, server=${serverResult.finalScore}`);
    }

    // Timing analysis
    const timingResult = analyzeInputTiming(
      answers.map((a) => a.timestamp),
      { minAvgResponseMs: 500 },
    );
    if (timingResult.isSuspicious) {
      cheatReasons.push(timingResult.reason!);
    }

    // Time overflow
    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed > config.timeLimitMs + 10000) {
      cheatReasons.push(`Time overflow: ${Math.round(elapsed / 1000)}s`);
    }

    const status = cheatReasons.length > 0 ? 'flagged' : 'completed';

    // Save inputs
    await this.prisma.input.createMany({
      data: verifiedAnswers.map((a) => ({
        gameSessionId,
        wordIndex: a.wordIndex,
        solved: a.solved,
        selectedOrder: JSON.stringify(a.selectedOrder),
        timeSpentMs: a.timeSpentMs,
        timestamp: BigInt(a.timestamp),
      })),
    });

    if (cheatReasons.length > 0) {
      await this.prisma.cheatFlag.createMany({
        data: cheatReasons.map((reason) => ({ gameSessionId, reason })),
      });
      void this.eventService.publishCheatFlagged(gameSessionId, playerId, session.stageId, cheatReasons.map((reason) => ({ reason, severity: 'warning' })));
    }

    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: gameSessionId, status: 'active' },
      data: { status, clientScore, serverScore: serverResult.finalScore, endedAt: new Date() },
    });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(gameSessionId, playerId, session.stageId, serverResult.finalScore);

    return {
      finalScore: serverResult.finalScore,
      status,
      wordsSolved: serverResult.wordsSolved,
      wordsTotal: serverResult.wordsTotal,
      timeBonus: serverResult.timeBonus,
    };
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
