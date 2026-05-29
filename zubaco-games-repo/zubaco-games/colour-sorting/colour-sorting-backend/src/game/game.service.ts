import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { generatePuzzle, executeMove, isValidMove, isPuzzleSolved } from './engine/puzzleGenerator';
import { calculateScore } from './engine/scorer';
import { getLevelConfig } from './engine/levelConfig';
import { randomUUID, randomBytes } from 'crypto';

interface MoveInput {
  fromTube: number;
  toTube: number;
  color: string;
  timestamp: number;
}

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  async startGame(userId: string, stageId: string, level?: number) {
    const config = await this.prisma.configuration.findUnique({ where: { stageId } });
    if (!config) throw new NotFoundException('Stage not found');

    // Apply level scaling if provided
    const levelParams = level ? getLevelConfig(level) : null;
    const timeLimitMs = levelParams?.timeLimitMs ?? config.timeLimitMs;
    const tubeCount = levelParams?.tubeCount ?? config.tubeCount;
    const colorCount = levelParams?.colorCount ?? config.colorCount;
    const ballsPerTube = levelParams?.ballsPerTube ?? config.ballsPerTube;
    const emptyTubes = levelParams?.emptyTubes ?? config.emptyTubes;

    // Expire any existing active session for this user+stage
    await this.prisma.gameSession.updateMany({
      where: { userId, stageId, status: 'active' },
      data: { status: 'expired' },
    });

    const serverSeed = randomBytes(16).toString('hex');
    const clientSeed = randomUUID();
    const nonce = Math.floor(Math.random() * 1_000_000);
    const finalSeed = computeFinalSeed(serverSeed, clientSeed, nonce);

    const endTime = new Date(Date.now() + timeLimitMs + 2000); // +2s grace

    const session = await this.prisma.gameSession.create({
      data: {
        userId,
        stageId,
        serverSeed,
        clientSeed,
        nonce,
        finalSeed,
        endTime,
      },
    });

    return {
      gameSessionId: session.id,
      endTime: endTime.toISOString(),
      serverTime: new Date().toISOString(),
      level: levelParams?.level ?? 1,
      config: {
        tubeCount,
        colorCount,
        ballsPerTube,
        emptyTubes,
        timeLimitMs,
        pointsPerSortedTube: config.pointsPerSortedTube,
        timeBonusMultiplier: config.timeBonusMultiplier,
        scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0,
      },
      seed: finalSeed,
    };
  }

  async submitResult(userId: string, gameSessionId: string, moves: MoveInput[], clientScore: number, solved: boolean) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new BadRequestException('Unauthorized');
    if (session.status !== 'active') throw new BadRequestException('Session already submitted');

    if (session.endTime && Date.now() > new Date(session.endTime).getTime() + 5000) {
      throw new BadRequestException('Game session has expired');
    }

    const config = await this.prisma.configuration.findUnique({ where: { stageId: session.stageId } });
    if (!config) throw new NotFoundException('Configuration missing');

    // Replay moves server-side
    let tubes = generatePuzzle(session.finalSeed, {
      colorCount: config.colorCount,
      ballsPerTube: config.ballsPerTube,
      emptyTubes: config.emptyTubes,
    });

    const cheatFlags: { reason: string; severity: string }[] = [];
    let invalidMoves = 0;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (!isValidMove(tubes, move.fromTube, move.toTube)) {
        invalidMoves++;
        if (invalidMoves > 3) {
          cheatFlags.push({ reason: `Too many invalid moves (${invalidMoves})`, severity: 'critical' });
        }
        continue;
      }
      tubes = executeMove(tubes, move.fromTube, move.toTube);
    }

    const serverSolved = isPuzzleSolved(tubes);

    // Anti-cheat: client claims solved but server disagrees
    if (solved && !serverSolved) {
      cheatFlags.push({ reason: 'Client claims solved but server replay disagrees', severity: 'critical' });
    }

    // Calculate server score
    const elapsed = new Date().getTime() - session.startedAt.getTime();
    const remainingMs = Math.max(0, config.timeLimitMs - elapsed);
    const serverResult = calculateScore(tubes, moves.length, {
      colorCount: config.colorCount,
      ballsPerTube: config.ballsPerTube,
      timeLimitMs: config.timeLimitMs,
      pointsPerSortedTube: config.pointsPerSortedTube,
      timeBonusMultiplier: config.timeBonusMultiplier,
    }, remainingMs);

    // Score divergence check
    if (Math.abs(clientScore - serverResult.finalScore) > 50) {
      cheatFlags.push({ reason: `Score mismatch: client=${clientScore} server=${serverResult.finalScore}`, severity: 'warning' });
    }

    // Atomic session claim to prevent double-submit
    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: gameSessionId, status: 'active' },
      data: {
        status: 'submitted',
        finalScore: serverResult.finalScore,
        solved: serverSolved,
        totalMoves: moves.length,
        sortedTubes: serverResult.sortedTubes,
      },
    });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    // Persist inputs and flags
    await this.prisma.input.createMany({
      data: moves.map((m, i) => ({
        gameSessionId,
        fromTube: m.fromTube,
        toTube: m.toTube,
        color: m.color,
        timestamp: BigInt(Math.round(m.timestamp)),
        sequence: i,
      })),
    });
    if (cheatFlags.length > 0) {
      await this.prisma.cheatFlag.createMany({
        data: cheatFlags.map((f) => ({ gameSessionId, ...f })),
      });
      void this.eventService.publishCheatFlagged(gameSessionId, userId, session!.stageId, cheatFlags);
    }

    void this.eventService.publishGameCompleted(gameSessionId, userId, session!.stageId, serverResult.finalScore);

    return {
      finalScore: serverResult.finalScore,
      status: 'submitted',
      sortedTubes: serverResult.sortedTubes,
      totalMoves: moves.length,
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
    if (!ingressUrl) return; // No-op in fallback mode
    const delayMs = Math.max(0, expiryAtMs - Date.now());
    const { scheduleExpiryViaRestate } = await import('../restate/game-expiry.service');
    await scheduleExpiryViaRestate(ingressUrl, sessionId, `${sessionId}`, delayMs);
  }
}
