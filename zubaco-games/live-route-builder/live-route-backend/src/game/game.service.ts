import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventService } from '../events/event.service';
import { computeFinalSeed } from './engine/random';
import { generateNodes, calculateOptimalPath, calculateActualPath, type GameConfig } from './engine/nodeGenerator';
import { analyzeInputTiming } from './engine/timingAnalyzer';
import { getLevelConfig } from './engine/levelConfig';
import * as crypto from 'crypto';

const DEFAULT_CONFIG: GameConfig = { nodeIntervalMs: 2000, totalNodes: 15, timeLimitMs: 60000, canvasWidth: 600, canvasHeight: 500 };

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly eventService: EventService) {}

  async startGame(playerId: string, stageId: string, level?: number) {
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId } });
    const config: GameConfig = dbConfig ? { nodeIntervalMs: dbConfig.nodeIntervalMs, totalNodes: dbConfig.totalNodes, timeLimitMs: dbConfig.timeLimitMs, canvasWidth: dbConfig.canvasWidth, canvasHeight: dbConfig.canvasHeight } : DEFAULT_CONFIG;

    const levelParams = level ? getLevelConfig(level) : null;
    if (levelParams) {
      config.timeLimitMs = levelParams.timeLimitMs;
      config.totalNodes = levelParams.nodeCount;
    }

    const serverSeed = crypto.randomBytes(16).toString('hex');
    const clientSeed = crypto.randomBytes(8).toString('hex');
    const nonce = Math.floor(Math.random() * 100000);
    const session = await this.prisma.gameSession.create({ data: { playerId, stageId, serverSeed, clientSeed, nonce, status: 'active' } });
    const seed = computeFinalSeed(serverSeed, clientSeed, nonce);

    return { gameSessionId: session.id, seed, config, serverTime: new Date().toISOString(), endTime: new Date(Date.now() + config.timeLimitMs + 2000).toISOString(), level: levelParams?.level ?? 1, scoreMultiplier: levelParams?.scoreMultiplier ?? 1.0 };
  }

  async submitGame(playerId: string, gameSessionId: string, edges: { from: number; to: number; timestamp: number }[], clientScore: number) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (session.playerId !== playerId) throw new ForbiddenException('Not your session');
    if (session.status !== 'active') throw new BadRequestException('Already completed');

    const cheatReasons: string[] = [];
    const seed = computeFinalSeed(session.serverSeed, session.clientSeed, session.nonce);
    const dbConfig = await this.prisma.configuration.findUnique({ where: { stageId: session.stageId } });
    const config: GameConfig = dbConfig ? { nodeIntervalMs: dbConfig.nodeIntervalMs, totalNodes: dbConfig.totalNodes, timeLimitMs: dbConfig.timeLimitMs, canvasWidth: dbConfig.canvasWidth, canvasHeight: dbConfig.canvasHeight } : DEFAULT_CONFIG;

    const maxEndTime = session.startedAt.getTime() + config.timeLimitMs + 5000;
    if (Date.now() > maxEndTime) throw new BadRequestException('Game session has expired');

    const nodes = generateNodes(seed, config);

    // Validate edges reference valid node IDs
    for (const e of edges) {
      if (e.from < 0 || e.from >= nodes.length || e.to < 0 || e.to >= nodes.length) {
        cheatReasons.push(`Invalid edge: ${e.from}->${e.to}`); break;
      }
    }

    const connectedNodes = new Set<number>();
    edges.forEach((e) => { connectedNodes.add(e.from); connectedNodes.add(e.to); });
    const connectedNodesList = nodes.filter((n) => connectedNodes.has(n.id));
    const optimal = calculateOptimalPath(connectedNodesList);
    const actual = calculateActualPath(nodes, edges);
    const pathEfficiency = actual > 0 ? (optimal / actual) * 100 : 100;
    const nodesConnected = connectedNodes.size;
    const serverScore = Math.round(pathEfficiency) + nodesConnected * 10;

    if (Math.abs(clientScore - serverScore) > 10) {
      cheatReasons.push(`Score divergence: client=${clientScore}, server=${serverScore}`);
    }

    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed > config.timeLimitMs + 10000) {
      cheatReasons.push(`Time overflow: ${Math.round(elapsed / 1000)}s`);
    }

    // Timing analysis
    const timingResult = analyzeInputTiming(
      edges.map((e) => e.timestamp),
      { minAvgResponseMs: 80 },
    );
    if (timingResult.isSuspicious) {
      cheatReasons.push(timingResult.reason!);
    }

    const status = cheatReasons.length > 0 ? 'flagged' : 'completed';
    await this.prisma.edgeRecord.createMany({ data: edges.map((e) => ({ gameSessionId, fromNode: e.from, toNode: e.to, timestamp: BigInt(e.timestamp) })) });
    if (cheatReasons.length > 0) await this.prisma.cheatFlag.createMany({ data: cheatReasons.map((reason) => ({ gameSessionId, reason })) });
    if (cheatReasons.length > 0) {
      void this.eventService.publishCheatFlagged(gameSessionId, playerId, session.stageId, cheatReasons.map((reason) => ({ reason, severity: 'warning' })));
    }
    const { count } = await this.prisma.gameSession.updateMany({ where: { id: gameSessionId, status: 'active' }, data: { status, clientScore, serverScore, endedAt: new Date() } });
    if (count === 0) throw new BadRequestException('Session already submitted or not found');

    void this.eventService.publishGameCompleted(gameSessionId, playerId, session.stageId, serverScore);

    return { finalScore: serverScore, status, pathEfficiency: Math.round(pathEfficiency), nodesConnected };
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
