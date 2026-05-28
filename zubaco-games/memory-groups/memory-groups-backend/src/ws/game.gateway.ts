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
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  namespace: '/game',
  transports: ['websocket', 'polling'],
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> socketIds

  handleConnection(client: Socket): void {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = process.env.JWT_SECRET || 'dev-secret';
      const decoded = jwt.verify(token, secret) as { sub: string };
      const userId = decoded.sub;

      client.data.userId = userId;
      client.join(`user:${userId}`);

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId;
    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)!.delete(client.id);
      if (this.connectedUsers.get(userId)!.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    client.join(`session:${data.sessionId}`);
    this.logger.debug(`Client ${client.id} joined session: ${data.sessionId}`);
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    client.leave(`session:${data.sessionId}`);
  }

  // ─── Server-side emission methods ───

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToSession(sessionId: string, event: string, payload: unknown): void {
    this.server.to(`session:${sessionId}`).emit(event, payload);
  }

  emitToAll(event: string, payload: unknown): void {
    this.server.emit(event, payload);
  }

  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
