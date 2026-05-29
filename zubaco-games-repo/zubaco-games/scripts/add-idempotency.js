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

// ─── Idempotency Interceptor ───
const idempotencyInterceptor = `import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';

export const IDEMPOTENT_KEY = 'idempotent';
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

interface CachedResponse {
  statusCode: number;
  body: unknown;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private redis: Redis | null = null;

  constructor(private readonly reflector: Reflector) {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      this.redis.connect().catch(() => {
        this.logger.warn('Redis unavailable for idempotency — disabled');
        this.redis = null;
      });
    } catch {
      this.redis = null;
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isIdempotent) return next.handle();

    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['x-idempotency-key'];

    if (!idempotencyKey) return next.handle();
    if (!this.redis) return next.handle();

    const cacheKey = \`idem:\${idempotencyKey}\`;

    // Check if we already processed this request
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const response: CachedResponse = JSON.parse(cached);
      this.logger.debug(\`Idempotent hit: \${idempotencyKey}\`);
      const res = context.switchToHttp().getResponse();
      res.status(response.statusCode);
      return of(response.body);
    }

    // Lock to prevent concurrent duplicate processing
    const lockKey = \`idem-lock:\${idempotencyKey}\`;
    const lockAcquired = await this.redis.set(lockKey, '1', 'EX', 30, 'NX');
    if (!lockAcquired) {
      throw new ConflictException('Request is already being processed');
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const res = context.switchToHttp().getResponse();
          const cached: CachedResponse = {
            statusCode: res.statusCode,
            body: responseBody,
          };
          const ttl = this.reflector.get<number>('idempotent_ttl', context.getHandler()) || DEFAULT_TTL_SECONDS;
          await this.redis!.set(cacheKey, JSON.stringify(cached), 'EX', ttl);
          await this.redis!.del(lockKey);
        } catch (err) {
          this.logger.error('Failed to cache idempotent response', err);
        }
      }),
    );
  }
}
`;

// ─── Idempotent Decorator ───
const idempotentDecorator = `import { SetMetadata, applyDecorators } from '@nestjs/common';
import { IDEMPOTENT_KEY } from './idempotency.interceptor';

/**
 * Marks an endpoint as idempotent.
 * Clients send X-Idempotency-Key header to deduplicate requests.
 * @param ttlSeconds How long to cache the response (default: 300s)
 */
export function Idempotent(ttlSeconds?: number): MethodDecorator {
  const decorators = [SetMetadata(IDEMPOTENT_KEY, true)];
  if (ttlSeconds) {
    decorators.push(SetMetadata('idempotent_ttl', ttlSeconds));
  }
  return applyDecorators(...decorators);
}
`;

// ─── Idempotency Module ───
const idempotencyModule = `import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from './idempotency.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class IdempotencyModule {}
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
  const idemDir = path.join(dir, 'src/idempotency');
  ensureDir(idemDir);

  writeIfMissing(path.join(idemDir, 'idempotency.interceptor.ts'), idempotencyInterceptor);
  writeIfMissing(path.join(idemDir, 'idempotent.decorator.ts'), idempotentDecorator);
  writeIfMissing(path.join(idemDir, 'idempotency.module.ts'), idempotencyModule);

  // Wire into app.module.ts
  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');

  if (!appModule.includes('IdempotencyModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].match(/^import /)) {
        insertIdx = i + 1;
        break;
      }
    }
    lines.splice(insertIdx, 0, "import { IdempotencyModule } from './idempotency/idempotency.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        IdempotencyModule,');
    fs.writeFileSync(appModulePath, appModule);
    console.log(`  WIRED IdempotencyModule`);
  }
});

console.log('\n\nDone! Idempotency layer added to all 20 backends.');
