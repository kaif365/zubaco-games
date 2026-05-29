const fs = require('fs');
const path = require('path');

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

// ─── Graceful Shutdown Service ───
const shutdownService = `import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private readonly shutdownSubject = new Subject<void>();
  private isShuttingDown = false;

  get isTerminating(): boolean {
    return this.isShuttingDown;
  }

  get shutdown$() {
    return this.shutdownSubject.asObservable();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.isShuttingDown = true;
    this.logger.warn(\`Shutdown signal received: \${signal || 'unknown'}\`);
    this.shutdownSubject.next();
    this.shutdownSubject.complete();

    // Allow in-flight requests to drain (configurable via env)
    const drainMs = parseInt(process.env.SHUTDOWN_DRAIN_MS || '5000', 10);
    this.logger.log(\`Draining connections for \${drainMs}ms...\`);
    await new Promise((resolve) => setTimeout(resolve, drainMs));
    this.logger.log('Shutdown complete');
  }
}
`;

// ─── Shutdown Module ───
const shutdownModule = `import { Module, Global } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown.service';

@Global()
@Module({
  providers: [GracefulShutdownService],
  exports: [GracefulShutdownService],
})
export class ShutdownModule {}
`;

// ─── Shutdown Health Indicator ───
const shutdownHealth = `import { Injectable } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown.service';

@Injectable()
export class ShutdownHealthIndicator {
  constructor(private readonly shutdownService: GracefulShutdownService) {}

  isHealthy(): boolean {
    return !this.shutdownService.isTerminating;
  }
}
`;

// ─── Redis IO Adapter for WS horizontal scaling ───
const redisAdapter = `import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication, Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(private app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => this.logger.error('Redis Pub error', err));
    subClient.on('error', (err) => this.logger.error('Redis Sub error', err));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Redis IO adapter connected');
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || '*',
        credentials: true,
      },
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`  CREATED ${path.relative('.', filePath)}`);
    return true;
  }
  return false;
}

all.forEach((dir) => {
  console.log(`\n=== ${dir} ===`);
  const shutdownDir = path.join(dir, 'src/shutdown');
  const wsDir = path.join(dir, 'src/ws');
  ensureDir(shutdownDir);

  writeIfMissing(path.join(shutdownDir, 'graceful-shutdown.service.ts'), shutdownService);
  writeIfMissing(path.join(shutdownDir, 'shutdown.module.ts'), shutdownModule);
  writeIfMissing(path.join(shutdownDir, 'shutdown-health.indicator.ts'), shutdownHealth);
  writeIfMissing(path.join(wsDir, 'redis-io.adapter.ts'), redisAdapter);

  // Wire ShutdownModule into app.module.ts
  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');

  if (!appModule.includes('ShutdownModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].match(/^import /)) {
        insertIdx = i + 1;
        break;
      }
    }
    lines.splice(insertIdx, 0, "import { ShutdownModule } from './shutdown/shutdown.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        ShutdownModule,');
    fs.writeFileSync(appModulePath, appModule);
    console.log(`  WIRED ShutdownModule`);
  }

  // Add @socket.io/redis-adapter + redis to package.json
  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let changed = false;

  if (!pkg.dependencies['@socket.io/redis-adapter']) {
    pkg.dependencies['@socket.io/redis-adapter'] = '^8.3.0';
    changed = true;
  }
  if (!pkg.dependencies['redis']) {
    pkg.dependencies['redis'] = '^4.7.0';
    changed = true;
  }
  if (!pkg.dependencies['rxjs']) {
    pkg.dependencies['rxjs'] = '^7.8.0';
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  DEPS updated`);
  }
});

console.log('\n\nDone! Graceful shutdown + Redis WS adapter added to all 20 backends.');
