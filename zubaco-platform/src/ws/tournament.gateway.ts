import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { config } from '../config';
import { RedisService } from '../common/redis/redis.service';
import { ReconnectionGraceService } from './reconnection-grace.service';
import {
  WS_HEARTBEAT_INTERVAL_MS,
  WS_HEARTBEAT_TIMEOUT_MS,
  REDIS_KEY_USER_SESSION_PREFIX,
} from './ws.constants';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/tournament',
  pingInterval: WS_HEARTBEAT_INTERVAL_MS,
  pingTimeout: WS_HEARTBEAT_TIMEOUT_MS,
  transports: ['websocket', 'polling'],
})
export class TournamentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TournamentGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly redis: RedisService,
    private readonly graceService: ReconnectionGraceService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!rawToken) {
        this.logger.warn(`Rejecting unauthenticated connection ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify JWT
      let decoded: { sub?: string; id?: string; userId?: string };
      try {
        decoded = this.jwtService.verify(rawToken, {
          secret: config.jwt.accessSecret,
        });
      } catch {
        this.logger.warn(`Invalid JWT token on socket ${client.id}`);
        client.disconnect();
        return;
      }

      const userId = decoded.sub || decoded.id || decoded.userId;
      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.join(`user:${userId}`);

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Record active connection in Redis
      await this.redis.set(
        `${REDIS_KEY_USER_SESSION_PREFIX}${userId}`,
        JSON.stringify({ socketId: client.id, connectedAt: Date.now() }),
        3600,
      );

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
      client.emit('connected', {
        status: 'CONNECTED',
        userId,
        heartbeatIntervalMs: WS_HEARTBEAT_INTERVAL_MS,
        timestamp: Date.now(),
      });
    } catch (err) {
      this.logger.error(`Connection error on socket ${client.id}:`, err);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.userId;
    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)!.delete(client.id);
      if (this.connectedUsers.get(userId)!.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Check if client was in an active match when disconnected
    const activeMatch = client.data?.activeMatch;
    if (userId && activeMatch) {
      try {
        await this.graceService.saveGraceSnapshot({
          matchId: activeMatch.matchId,
          userId,
          tournamentId: activeMatch.tournamentId || 'unknown',
          stageNumber: activeMatch.stageNumber || 1,
          level: activeMatch.level || 1,
          currentScore: activeMatch.currentScore || 0,
          lastSeq: activeMatch.lastSeq || 0,
          disconnectedAt: Date.now(),
          metadata: {
            socketId: client.id,
            matchTicket: activeMatch.matchTicket,
          },
        });
        this.logger.log(
          `Socket ${client.id} disconnected mid-match. 30s grace period activated for match ${activeMatch.matchId}`,
        );
      } catch (err) {
        this.logger.error(`Failed to snapshot match state on disconnect for user ${userId}:`, err);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket): void {
    client.emit('heartbeat-ack', {
      serverTime: Date.now(),
      intervalMs: WS_HEARTBEAT_INTERVAL_MS,
    });
  }

  @SubscribeMessage('join-tournament')
  handleJoinTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ): void {
    if (!data?.tournamentId) return;
    client.join(`tournament:${data.tournamentId}`);
    this.logger.debug(`Socket ${client.id} joined tournament room ${data.tournamentId}`);
    client.emit('tournament-joined', {
      tournamentId: data.tournamentId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('leave-tournament')
  handleLeaveTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ): void {
    if (!data?.tournamentId) return;
    client.leave(`tournament:${data.tournamentId}`);
  }

  @SubscribeMessage('register-active-match')
  handleRegisterActiveMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      matchId: string;
      tournamentId: string;
      stageNumber: number;
      level: number;
      currentScore: number;
      matchTicket?: string;
    },
  ): void {
    if (!client.data.userId || !data?.matchId) return;
    client.data.activeMatch = {
      matchId: data.matchId,
      tournamentId: data.tournamentId,
      stageNumber: data.stageNumber,
      level: data.level,
      currentScore: data.currentScore,
      lastSeq: 1,
      matchTicket: data.matchTicket,
    };
    client.join(`match:${data.matchId}`);
    client.emit('match-registered', { matchId: data.matchId, status: 'TRACKING' });
  }

  @SubscribeMessage('resume-match')
  async handleResumeMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; matchTicket?: string },
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId || !data?.matchId) {
      client.emit('match-resume-failed', { reason: 'UNAUTHENTICATED_OR_MISSING_MATCH_ID' });
      return;
    }

    const result = await this.graceService.resumeSession(data.matchId, userId, data.matchTicket);
    if (!result.resumed || !result.snapshot) {
      client.emit('match-resume-failed', {
        matchId: data.matchId,
        reason: result.reason || 'RESUMPTION_FAILED',
      });
      return;
    }

    // Attach active match back to socket
    client.data.activeMatch = {
      matchId: result.snapshot.matchId,
      tournamentId: result.snapshot.tournamentId,
      stageNumber: result.snapshot.stageNumber,
      level: result.snapshot.level,
      currentScore: result.snapshot.currentScore,
      lastSeq: result.snapshot.lastSeq,
    };
    client.join(`match:${result.snapshot.matchId}`);

    client.emit('match-resumed', {
      matchId: result.snapshot.matchId,
      tournamentId: result.snapshot.tournamentId,
      stageNumber: result.snapshot.stageNumber,
      level: result.snapshot.level,
      currentScore: result.snapshot.currentScore,
      lastSeq: result.snapshot.lastSeq,
      restoredAt: Date.now(),
    });
  }

  // ─── Broadcasters ───

  broadcastStageResults(
    tournamentId: string,
    stageNumber: number,
    results: {
      survivedCount: number;
      eliminatedCount: number;
      nextStageStartsInSeconds: number;
      topQualifiers: Array<{ userId: string; score: number; rank: number }>;
    },
  ): void {
    if (!this.server) return;
    this.server.to(`tournament:${tournamentId}`).emit('STAGE_RESULTS', {
      tournamentId,
      stageNumber,
      results,
      broadcastAt: new Date().toISOString(),
    });
  }

  broadcastToTournament(tournamentId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`tournament:${tournamentId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
