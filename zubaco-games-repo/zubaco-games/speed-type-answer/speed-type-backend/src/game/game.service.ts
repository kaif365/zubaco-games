import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { selectQuestions } from './engine/questionBank';
import { getLevelConfig } from './engine/levelConfig';
import { randomUUID } from 'crypto';
import type { StartGameDto } from './dto/start-game.dto';
import type { SubmitGameDto } from './dto/submit-game.dto';

export interface GameConfig {
  flashDurationMs: number;
  answerTimeMs: number;
  totalQuestions: number;
  pointsPerCorrect: number;
  speedBonusMax: number;
}

@Injectable()
export class GameService {
  private readonly config: GameConfig = {
    flashDurationMs: 3000,
    answerTimeMs: 5000,
    totalQuestions: 10,
    pointsPerCorrect: 20,
    speedBonusMax: 10,
  };

  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(playerId: string, dto: StartGameDto) {
    const levelParams = dto.level ? getLevelConfig(dto.level) : null;
    const config = { ...this.config };
    if (levelParams) {
      config.totalQuestions = levelParams.questionCount;
    }
    const serverSeed = randomUUID();
    const session = await this.prisma.gameSession.create({
      data: { playerId, serverSeed, clientSeed: dto.clientSeed, config: config as object },
    });
    const totalGameTimeMs = config.totalQuestions * (config.flashDurationMs + config.answerTimeMs);
    return { gameSessionId: session.id, serverSeed, config, serverTime: new Date().toISOString(), endTime: new Date(Date.now() + totalGameTimeMs + 2000).toISOString(), level: levelParams?.level ?? 1, scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0 };
  }

  async submitGame(playerId: string, dto: SubmitGameDto) {
    const session = await this.prisma.gameSession.findFirst({ where: { id: dto.gameSessionId, playerId, status: 'active' } });
    if (!session) throw new BadRequestException('Invalid or already completed session');

    const maxGameTime = this.config.totalQuestions * (this.config.flashDurationMs + this.config.answerTimeMs);
    if (Date.now() > session.createdAt.getTime() + maxGameTime + 5000) {
      throw new BadRequestException('Game session has expired');
    }

    const finalSeed = computeFinalSeed(session.serverSeed, session.clientSeed, session.nonce);
    const questions = selectQuestions(finalSeed, this.config.totalQuestions);

    let serverScore = 0;
    let correctAnswers = 0;
    for (const ans of dto.answers) {
      const q = questions.find(qq => qq.id === ans.questionId);
      if (!q) continue;
      if (ans.userAnswer.trim().toLowerCase() === q.answer.toLowerCase()) {
        correctAnswers++;
        let pts = this.config.pointsPerCorrect;
        const speedRatio = Math.max(0, 1 - ans.responseTimeMs / this.config.answerTimeMs);
        pts += Math.round(speedRatio * this.config.speedBonusMax);
        serverScore += pts;
      }
    }

    const divergence = Math.abs(serverScore - dto.clientScore);
    const status = divergence <= 2 ? 'verified' : 'flagged';

    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: session.id, status: 'active' },
      data: { answers: dto.answers as object[], clientScore: dto.clientScore, serverScore, status, completedAt: new Date() },
    });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(session.id, playerId, 'speed-type', serverScore);
    if (status === 'flagged') {
      void this.eventService.publishCheatFlagged(session.id, playerId, 'speed-type', [{ reason: `Score divergence: client=${dto.clientScore} server=${serverScore}`, severity: 'warning' }]);
    }

    return { finalScore: serverScore, status, correctAnswers };
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
