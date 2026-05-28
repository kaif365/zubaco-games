import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { generateStatements } from './engine/statementBank';
import { calculateScore, type BlitzAnswer, type StageConfig } from './engine/scorer';
import { analyzeInputTiming } from './engine/timingAnalyzer';
import { getLevelConfig } from './engine/levelConfig';
import * as crypto from 'crypto';

const DEFAULT_CONFIG: StageConfig = {
  totalStatements: 30,
  displayTimeMs: 2000,
  timeLimitMs: 60000,
  pointsPerCorrect: 10,
  penaltyPerWrong: 5,
  streakThreshold: 3,
  streakBonus: 5,
};

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(playerId: string, stageId: string, level?: number) {
    // Load config from DB or use defaults
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId } });
    const config: StageConfig = dbConfig
      ? {
          totalStatements: dbConfig.totalStatements,
          displayTimeMs: dbConfig.displayTimeMs,
          timeLimitMs: dbConfig.timeLimitMs,
          pointsPerCorrect: dbConfig.pointsPerCorrect,
          penaltyPerWrong: dbConfig.penaltyPerWrong,
          streakThreshold: dbConfig.streakThreshold,
          streakBonus: dbConfig.streakBonus,
        }
      : DEFAULT_CONFIG;

    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      config.timeLimitMs = levelParams.timeLimitMs;
      config.totalStatements = levelParams.questionCount;
      config.displayTimeMs = levelParams.timePerQuestionMs;
    }

    const serverSeed = crypto.randomBytes(16).toString('hex');
    const clientSeed = crypto.randomBytes(8).toString('hex');
    const nonce = Math.floor(Math.random() * 100000);

    const session = await this.prisma.gameSession.create({
      data: { playerId, stageId, serverSeed, clientSeed, nonce, status: 'active' },
    });

    const seed = computeFinalSeed(serverSeed, clientSeed, nonce);

    const endTime = new Date(Date.now() + config.timeLimitMs + 5000); // 5s grace

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
    answers: BlitzAnswer[],
    clientScore: number,
  ) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session');
    if (session.status !== 'active') throw new BadRequestException('Session already completed');

    const cheatReasons: string[] = [];

    // 1. Regenerate statements server-side
    const seed = computeFinalSeed(session.serverSeed, session.clientSeed, session.nonce);

    // Load config
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId: session.stageId } });
    const config: StageConfig = dbConfig
      ? {
          totalStatements: dbConfig.totalStatements,
          displayTimeMs: dbConfig.displayTimeMs,
          timeLimitMs: dbConfig.timeLimitMs,
          pointsPerCorrect: dbConfig.pointsPerCorrect,
          penaltyPerWrong: dbConfig.penaltyPerWrong,
          streakThreshold: dbConfig.streakThreshold,
          streakBonus: dbConfig.streakBonus,
        }
      : DEFAULT_CONFIG;

    const maxEndTime = session.startedAt.getTime() + config.timeLimitMs + 5000;
    if (Date.now() > maxEndTime) throw new BadRequestException('Game session has expired');

    const statements = generateStatements(seed, config.totalStatements);

    // 2. Verify each answer correctness
    let invalidAnswerCount = 0;
    const verifiedAnswers: BlitzAnswer[] = answers.map((a) => {
      const stmt = statements[a.statementIndex];
      if (!stmt) {
        invalidAnswerCount++;
        return a;
      }
      const serverCorrect = stmt.isTrue === a.chosenTrue;
      if (serverCorrect !== a.correct) invalidAnswerCount++;
      return { ...a, correct: serverCorrect };
    });

    if (invalidAnswerCount > 0) {
      cheatReasons.push(`${invalidAnswerCount} answer(s) had tampered correctness`);
    }

    // 3. Calculate server score
    const serverResult = calculateScore(verifiedAnswers, config.totalStatements, config);

    // 4. Score divergence check
    const scoreDiff = Math.abs(clientScore - serverResult.finalScore);
    if (scoreDiff > 0) {
      cheatReasons.push(`Score divergence: client=${clientScore}, server=${serverResult.finalScore}`);
    }

    // 5. Timing analysis - check for bot (impossibly fast answers)
    const timingResult = analyzeInputTiming(
      answers.map((a) => a.timestamp),
      { minAvgResponseMs: 200 },
    );
    if (timingResult.isSuspicious) {
      cheatReasons.push(timingResult.reason!);
    }

    // 6. Time overflow check
    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed > config.timeLimitMs + 10000) {
      cheatReasons.push(`Time overflow: game ran ${Math.round(elapsed / 1000)}s (limit: ${config.timeLimitMs / 1000}s)`);
    }

    // Determine status
    const status = cheatReasons.length > 0 ? 'flagged' : 'completed';

    // Save inputs
    await this.prisma.input.createMany({
      data: verifiedAnswers.map((a) => ({
        gameSessionId,
        statementIndex: a.statementIndex,
        chosenTrue: a.chosenTrue,
        correct: a.correct,
        timestamp: BigInt(a.timestamp),
      })),
    });

    // Save cheat flags
    if (cheatReasons.length > 0) {
      await this.prisma.cheatFlag.createMany({
        data: cheatReasons.map((reason) => ({ gameSessionId, reason })),
      });
      void this.eventService.publishCheatFlagged(gameSessionId, playerId, session.stageId, cheatReasons.map((reason) => ({ reason, severity: 'warning' })));
    }

    // Update session (atomic to prevent double-submit)
    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: gameSessionId, status: 'active' },
      data: {
        status,
        clientScore,
        serverScore: serverResult.finalScore,
        endedAt: new Date(),
      },
    });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(gameSessionId, playerId, session.stageId, serverResult.finalScore);

    return {
      finalScore: serverResult.finalScore,
      status,
      correctCount: serverResult.correctCount,
      wrongCount: serverResult.wrongCount,
      missedCount: serverResult.missedCount,
      streakBonus: serverResult.streakBonus,
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
