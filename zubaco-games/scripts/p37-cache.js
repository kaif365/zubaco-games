const fs = require('fs');
const path = require('path');

const all = [
  'flash-spot/flash-spot-backend','colour-sorting/colour-sorting-backend','object-placement-memory/object-placement-memory-backend',
  'rapid-category-sort/rapid-sort-backend','true-false-blitz/true-false-blitz-backend','word-unscramble/word-unscramble-backend',
  'number-grid-sprint/number-grid-backend','live-route-builder/live-route-backend','memory-groups/memory-groups-backend',
  'reflex-endurance/reflex-endurance-backend','pattern-survival/pattern-survival-backend','speed-type-answer/speed-type-backend',
  'sequence-recall/sequence-recall-backend','memory-card-matching/memory-card-matching-backend','sliding-puzzle/sliding-puzzle-backend',
  'block-fill/block-fill-backend','maze-navigation/maze-navigation-backend','Infinity-loop/Infinity-Loop-backend',
  'arrows/arrows-backend','logic-reflector/logic-reflector-backend',
];

const cacheInterceptor = `import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_KEY_PREFIX = 'cache_key_prefix';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);
  private redis: Redis | null = null;

  constructor(private readonly reflector: Reflector) {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
      this.redis.connect().catch(() => { this.redis = null; });
    } catch {
      this.redis = null;
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());
    if (!ttl || !this.redis) return next.handle();

    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') return next.handle();

    const prefix = this.reflector.get<string>(CACHE_KEY_PREFIX, context.getHandler()) || '';
    const cacheKey = \`http-cache:\${prefix}:\${request.url}\`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(\`Cache HIT: \${cacheKey}\`);
        return of(JSON.parse(cached));
      }
    } catch {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.redis!.set(cacheKey, JSON.stringify(response), 'EX', ttl);
        } catch {}
      }),
    );
  }
}
`;

const cacheDecorator = `import { SetMetadata, applyDecorators } from '@nestjs/common';
import { CACHE_TTL_KEY, CACHE_KEY_PREFIX } from './http-cache.interceptor';

/**
 * Cache GET endpoint response in Redis.
 * @param ttlSeconds Cache TTL in seconds
 * @param keyPrefix Optional cache key prefix for namespacing
 */
export function CacheResponse(ttlSeconds: number, keyPrefix?: string): MethodDecorator {
  const decorators = [SetMetadata(CACHE_TTL_KEY, ttlSeconds)];
  if (keyPrefix) decorators.push(SetMetadata(CACHE_KEY_PREFIX, keyPrefix));
  return applyDecorators(...decorators);
}
`;

const cacheInvalidationService = `import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private redis: Redis | null = null;

  constructor() {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
      this.redis.connect().catch(() => { this.redis = null; });
    } catch {
      this.redis = null;
    }
  }

  async invalidateByPrefix(prefix: string): Promise<number> {
    if (!this.redis) return 0;
    const keys = await this.redis.keys(\`http-cache:\${prefix}:*\`);
    if (keys.length === 0) return 0;
    const deleted = await this.redis.del(...keys);
    this.logger.log(\`Invalidated \${deleted} cached entries for prefix: \${prefix}\`);
    return deleted;
  }

  async invalidateByUrl(url: string): Promise<void> {
    if (!this.redis) return;
    const keys = await this.redis.keys(\`http-cache:*:\${url}\`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async flushAll(): Promise<void> {
    if (!this.redis) return;
    const keys = await this.redis.keys('http-cache:*');
    if (keys.length > 0) await this.redis.del(...keys);
    this.logger.warn('All HTTP cache flushed');
  }
}
`;

const cacheModule = `import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpCacheInterceptor } from './http-cache.interceptor';
import { CacheInvalidationService } from './cache-invalidation.service';

@Global()
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    CacheInvalidationService,
  ],
  exports: [CacheInvalidationService],
})
export class HttpCacheModule {}
`;

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function writeIfMissing(fp, c) { if (!fs.existsSync(fp)) { fs.writeFileSync(fp, c); return true; } return false; }

all.forEach((dir) => {
  const cDir = path.join(dir, 'src/http-cache');
  ensureDir(cDir);
  writeIfMissing(path.join(cDir, 'http-cache.interceptor.ts'), cacheInterceptor);
  writeIfMissing(path.join(cDir, 'cache-response.decorator.ts'), cacheDecorator);
  writeIfMissing(path.join(cDir, 'cache-invalidation.service.ts'), cacheInvalidationService);
  writeIfMissing(path.join(cDir, 'http-cache.module.ts'), cacheModule);

  const appModulePath = path.join(dir, 'src/app.module.ts');
  let appModule = fs.readFileSync(appModulePath, 'utf8');
  if (!appModule.includes('HttpCacheModule')) {
    const lines = appModule.split('\n');
    let insertIdx = 0;
    for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].match(/^import /)) { insertIdx = i + 1; break; } }
    lines.splice(insertIdx, 0, "import { HttpCacheModule } from './http-cache/http-cache.module';");
    appModule = lines.join('\n');
    appModule = appModule.replace(/imports: \[/, 'imports: [\n        HttpCacheModule,');
    fs.writeFileSync(appModulePath, appModule);
  }
  console.log(`OK ${dir}`);
});
console.log('\\nP37 Done!');
