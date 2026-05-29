const fs = require('fs');
const path = require('path');

// All 20 backends
const all = [
  'flash-spot/flash-spot-backend',
  'colour-sorting/colour-sorting-backend',
  'object-placement-memory/object-placement-memory-backend',
  'rapid-category-sort/rapid-sort-backend',
  'true-false-blitz/true-false-blitz-backend',
  'word-unscramble/word-unscramble-backend',
  'number-grid-sprint/number-grid-backend',
  'live-route-builder/live-route-backend',
  'memory-groups/memory-groups-backend',
  'reflex-endurance/reflex-endurance-backend',
  'pattern-survival/pattern-survival-backend',
  'speed-type-answer/speed-type-backend',
  'sequence-recall/sequence-recall-backend',
  'memory-card-matching/memory-card-matching-backend',
  'sliding-puzzle/sliding-puzzle-backend',
  'block-fill/block-fill-backend',
  'maze-navigation/maze-navigation-backend',
  'Infinity-loop/Infinity-Loop-backend',
  'arrows/arrows-backend',
  'logic-reflector/logic-reflector-backend',
];

// ─── WebSocket Gateway ───
const wsGateway = `import {
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
  server: Server;

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
      client.join(\`user:\${userId}\`);

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      this.logger.log(\`Client connected: \${client.id} (user: \${userId})\`);
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
    this.logger.log(\`Client disconnected: \${client.id}\`);
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    client.join(\`session:\${data.sessionId}\`);
    this.logger.debug(\`Client \${client.id} joined session: \${data.sessionId}\`);
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    client.leave(\`session:\${data.sessionId}\`);
  }

  // ─── Server-side emission methods ───

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(\`user:\${userId}\`).emit(event, payload);
  }

  emitToSession(sessionId: string, event: string, payload: unknown): void {
    this.server.to(\`session:\${sessionId}\`).emit(event, payload);
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
`;

// ─── WebSocket Module ───
const wsModule = `import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';

@Module({
  providers: [GameGateway],
  exports: [GameGateway],
})
export class WsModule {}
`;

// ─── WebSocket Event Types ───
const wsEventTypes = `export enum WsEvent {
  // Server -> Client
  GAME_STARTED = 'game:started',
  SCORE_UPDATED = 'game:score-updated',
  SESSION_COMPLETED = 'game:session-completed',
  SESSION_EXPIRED = 'game:session-expired',
  CHEAT_DETECTED = 'game:cheat-detected',
  LEADERBOARD_UPDATE = 'game:leaderboard-update',

  // Client -> Server
  JOIN_SESSION = 'join-session',
  LEAVE_SESSION = 'leave-session',
  PING = 'ping',
}

export interface WsPayload<T = unknown> {
  event: WsEvent;
  timestamp: string;
  data: T;
}
`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`  CREATED ${filePath}`);
    return true;
  }
  return false;
}

all.forEach((dir) => {
  console.log(`\n=== ${dir} ===`);
  const wsDir = path.join(dir, 'src/ws');
  ensureDir(wsDir);

  writeIfMissing(path.join(wsDir, 'game.gateway.ts'), wsGateway);
  writeIfMissing(path.join(wsDir, 'ws.module.ts'), wsModule);
  writeIfMissing(path.join(wsDir, 'ws-event.types.ts'), wsEventTypes);

  // Wire WsModule into app.module.ts
  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');

  if (appModule.includes('WsModule')) {
    console.log(`  SKIP (WsModule already wired)`);
    return;
  }

  // Add import
  const lines = appModule.split('\n');
  let insertIdx = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].match(/^import /)) {
      insertIdx = i + 1;
      break;
    }
  }
  lines.splice(insertIdx, 0, "import { WsModule } from './ws/ws.module';");
  appModule = lines.join('\n');

  // Add to imports array
  appModule = appModule.replace(
    /imports: \[/,
    'imports: [\n        WsModule,'
  );

  fs.writeFileSync(appModulePath, appModule);
  console.log(`  WIRED app.module.ts`);
});

// ─── Add socket.io deps to backends that don't have them ───
all.forEach((dir) => {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  let changed = false;
  if (!pkg.dependencies['@nestjs/websockets']) {
    pkg.dependencies['@nestjs/websockets'] = '^11.0.0';
    changed = true;
  }
  if (!pkg.dependencies['@nestjs/platform-socket.io']) {
    pkg.dependencies['@nestjs/platform-socket.io'] = '^11.0.0';
    changed = true;
  }
  if (!pkg.dependencies['socket.io']) {
    pkg.dependencies['socket.io'] = '^4.8.0';
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  DEPS   ${pkgPath}`);
  }
});

console.log('\n\nDone! WebSocket gateway added to all 20 backends.');
