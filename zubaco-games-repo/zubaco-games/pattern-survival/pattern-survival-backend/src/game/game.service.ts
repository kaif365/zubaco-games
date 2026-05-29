import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { getLevelConfig } from './engine/levelConfig';
import * as crypto from 'crypto';

export interface GameConfig { gridSize: number; timeLimitMs: number; flashDurationMs: number; pointsPerRound: number; perfectBonus: number; colors: string[]; }
const DEFAULT_COLORS = ['red','green','blue','yellow','purple','orange'];
const DEFAULT_CONFIG: GameConfig = { gridSize: 3, timeLimitMs: 300000, flashDurationMs: 500, pointsPerRound: 20, perfectBonus: 10, colors: DEFAULT_COLORS };

/** Mirrors frontend sequenceGenerator.ts exactly */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function generateSequence(seed: number, round: number): number[] {
  const rng = mulberry32(seed + round * 7919);
  const sequence: number[] = [];
  for (let i = 0; i <= round; i++) {
    sequence.push(Math.floor(rng() * 9));
  }
  return sequence;
}

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(playerId: string, stageId: string, level?: number) {
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId } });
    const config: GameConfig = dbConfig ? { gridSize: dbConfig.gridSize, timeLimitMs: dbConfig.timeLimitMs, flashDurationMs: dbConfig.flashDurationMs, pointsPerRound: dbConfig.pointsPerRound, perfectBonus: dbConfig.perfectBonus, colors: DEFAULT_COLORS } : DEFAULT_CONFIG;

    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      config.timeLimitMs = levelParams.timeLimitMs;
      config.flashDurationMs = levelParams.displaySpeedMs;
    }
    const serverSeed = crypto.randomBytes(16).toString('hex');
    const clientSeed = crypto.randomBytes(8).toString('hex');
    const nonce = Math.floor(Math.random() * 100000);
    const session = await this.prisma.gameSession.create({ data: { playerId, stageId, serverSeed, clientSeed, nonce, status: 'active' } });
    const seed = computeFinalSeed(serverSeed, clientSeed, nonce);
    return { gameSessionId: session.id, seed, config, serverTime: new Date().toISOString(), endTime: new Date(Date.now() + config.timeLimitMs + 2000).toISOString(), level: levelParams?.level ?? 1, scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0 };
  }

  async submitGame(playerId: string, dto: { gameSessionId: string; roundInputs: number[][]; perfectRounds: number; clientScore: number }) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: dto.gameSessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session');
    if (session.status !== 'active') throw new BadRequestException('Already completed');

    // Limit round inputs to prevent DoS
    if (dto.roundInputs.length > 500) throw new BadRequestException('Too many rounds submitted');

    const cheatReasons: string[] = [];
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId: session.stageId } });
    const config = dbConfig ? { pointsPerRound: dbConfig.pointsPerRound, perfectBonus: dbConfig.perfectBonus } : { pointsPerRound: 20, perfectBonus: 10 };

    // SERVER-SIDE VALIDATION: Regenerate expected sequences and verify player inputs
    const seed = computeFinalSeed(session.serverSeed, session.clientSeed, session.nonce);
    let verifiedRounds = 0;
    let verifiedPerfectRounds = 0;

    for (let round = 0; round < dto.roundInputs.length; round++) {
      const expectedSeq = generateSequence(seed, round);
      const playerInput = dto.roundInputs[round]!;

      if (playerInput.length !== expectedSeq.length) break; // Wrong length = game over

      let roundCorrect = true;
      for (let i = 0; i < expectedSeq.length; i++) {
        if (playerInput[i] !== expectedSeq[i]) {
          roundCorrect = false;
          break;
        }
      }

      if (!roundCorrect) break; // First wrong = game over
      verifiedRounds++;
      // TODO: Perfect detection could also check hesitation timing from client
      // For now, trust that a completed round with no mistake counts if under threshold
    }

    // Perfect rounds can't exceed verified rounds
    verifiedPerfectRounds = Math.min(dto.perfectRounds, verifiedRounds);

    const serverScore = verifiedRounds * config.pointsPerRound + verifiedPerfectRounds * config.perfectBonus;

    if (Math.abs(dto.clientScore - serverScore) > 10) {
      cheatReasons.push(`Score divergence: client=${dto.clientScore}, server=${serverScore}`);
    }
    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed > DEFAULT_CONFIG.timeLimitMs + 5000) {
      throw new BadRequestException('Game session has expired');
    }

    const status = cheatReasons.length > 0 ? 'flagged' : 'completed';
    if (cheatReasons.length > 0) await this.prisma.cheatFlag.createMany({ data: cheatReasons.map((reason) => ({ gameSessionId: dto.gameSessionId, reason })) });
    if (cheatReasons.length > 0) {
      void this.eventService.publishCheatFlagged(dto.gameSessionId, playerId, session.stageId, cheatReasons.map((reason) => ({ reason, severity: 'warning' })));
    }
    const { count } = await this.prisma.gameSession.updateMany({ where: { id: dto.gameSessionId, status: 'active' }, data: { status, clientScore: dto.clientScore, serverScore, roundsReached: verifiedRounds, endedAt: new Date() } });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(dto.gameSessionId, playerId, session.stageId, serverScore);

    return { finalScore: serverScore, status, roundsReached: verifiedRounds };
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
