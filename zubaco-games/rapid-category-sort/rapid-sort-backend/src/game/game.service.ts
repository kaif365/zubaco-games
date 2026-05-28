import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { generateItemSequence } from './engine/contentGenerator';
import { calculateScore } from './engine/scorer';
import { getLevelConfig } from './engine/levelConfig';
import { randomUUID, randomBytes } from 'crypto';

interface AnswerInput {
  itemIndex: number;
  chosenSide: 'left' | 'right';
  timestamp: number;
  correct: boolean;
}

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(userId: string, stageId: string, level?: number) {
    const config = await this.prisma.configuration.findUnique({ where: { stageId } });
    if (!config) throw new NotFoundException('Stage not found');

    const levelParams = level ? getLevelConfig(level) : null;

    // Expire any existing active session for this user+stage
    await this.prisma.gameSession.updateMany({
      where: { userId, stageId, status: 'active' },
      data: { status: 'expired' },
    });

    const serverSeed = randomBytes(16).toString('hex');
    const clientSeed = randomUUID();
    const nonce = Math.floor(Math.random() * 1_000_000);
    const finalSeed = computeFinalSeed(serverSeed, clientSeed, nonce);

    const endTime = new Date(Date.now() + (levelParams?.timeLimitMs ?? config.timeLimitMs) + 2000);

    const session = await this.prisma.gameSession.create({
      data: { userId, stageId, serverSeed, clientSeed, nonce, finalSeed, endTime },
    });

    return {
      gameSessionId: session.id,
      endTime: endTime.toISOString(),
      serverTime: new Date().toISOString(),
      config: {
        totalItems: levelParams?.itemCount ?? config.totalItems,
        itemIntervalMs: config.itemIntervalMs,
        itemVisibleMs: config.itemVisibleMs,
        timeLimitMs: levelParams?.timeLimitMs ?? config.timeLimitMs,
        pointsPerCorrect: config.pointsPerCorrect,
        penaltyPerWrong: config.penaltyPerWrong,
        categoryPoolSize: levelParams?.categoryCount ?? config.categoryPoolSize,
      },
      seed: finalSeed,
      level: levelParams?.level ?? 1,
      scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0,
    };
  }

  async submitResult(userId: string, gameSessionId: string, answers: AnswerInput[], clientScore: number) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new BadRequestException('Unauthorized');
    if (session.status !== 'active') throw new BadRequestException('Session already submitted');

    if (session.endTime && Date.now() > new Date(session.endTime).getTime() + 5000) {
      throw new BadRequestException('Game session has expired');
    }

    const config = await this.prisma.configuration.findUnique({ where: { stageId: session.stageId } });
    if (!config) throw new NotFoundException('Configuration missing');

    // Server-side verification: regenerate the item sequence from seed
    const { sequence } = generateItemSequence(session.finalSeed, config.totalItems, config.categoryPoolSize);

    const cheatFlags: { reason: string; severity: string }[] = [];
    const verifiedAnswers: AnswerInput[] = [];

    for (const answer of answers) {
      const item = sequence[answer.itemIndex];
      if (!item) {
        cheatFlags.push({ reason: `Invalid item index ${answer.itemIndex}`, severity: 'critical' });
        continue;
      }
      // Verify correctness server-side (don't trust client's `correct` field)
      const serverCorrect = item.correctSide === answer.chosenSide;
      if (answer.correct !== serverCorrect) {
        cheatFlags.push({ reason: `Answer correctness mismatch at item ${answer.itemIndex}`, severity: 'warning' });
      }
      verifiedAnswers.push({ ...answer, correct: serverCorrect });
    }

    // Calculate server score
    const serverResult = calculateScore(verifiedAnswers, {
      totalItems: config.totalItems,
      pointsPerCorrect: config.pointsPerCorrect,
      penaltyPerWrong: config.penaltyPerWrong,
    });

    // Score divergence
    if (Math.abs(clientScore - serverResult.finalScore) > 30) {
      cheatFlags.push({ reason: `Score mismatch: client=${clientScore} server=${serverResult.finalScore}`, severity: 'warning' });
    }

    // Timing analysis: check for impossibly fast answers
    const fastAnswers = answers.filter((a, i) => {
      if (i === 0) return false;
      const delta = a.timestamp - answers[i - 1].timestamp;
      return delta < 100; // less than 100ms between answers is suspicious
    });
    if (fastAnswers.length > 5) {
      cheatFlags.push({ reason: `${fastAnswers.length} answers with < 100ms gap (bot pattern)`, severity: 'critical' });
    }

    // Atomic session claim to prevent double-submit
    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: gameSessionId, status: 'active' },
      data: {
        status: 'submitted',
        finalScore: serverResult.finalScore,
        correctCount: serverResult.correctCount,
        wrongCount: serverResult.wrongCount,
        missedCount: serverResult.missedCount,
      },
    });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    // Persist inputs and flags
    await this.prisma.input.createMany({
      data: verifiedAnswers.map((a, i) => ({
        gameSessionId,
        itemIndex: a.itemIndex,
        chosenSide: a.chosenSide,
        correct: a.correct,
        timestamp: BigInt(Math.round(a.timestamp)),
        sequence: i,
      })),
    });
    if (cheatFlags.length > 0) {
      await this.prisma.cheatFlag.createMany({ data: cheatFlags.map((f) => ({ gameSessionId, ...f })) });
      void this.eventService.publishCheatFlagged(gameSessionId, userId, session.stageId, cheatFlags);
    }

    void this.eventService.publishGameCompleted(gameSessionId, userId, session.stageId, serverResult.finalScore);

    return {
      finalScore: serverResult.finalScore,
      status: 'submitted',
      correctCount: serverResult.correctCount,
      wrongCount: serverResult.wrongCount,
      missedCount: serverResult.missedCount,
    };
  }

  async gameOver(userId: string, gameSessionId: string, reason: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new BadRequestException('Unauthorized');
    if (session.status !== 'active') return { status: session.status };

    await this.prisma.gameSession.update({
      where: { id: gameSessionId },
      data: { status: 'expired' },
    });
    return { status: 'expired', reason };
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
