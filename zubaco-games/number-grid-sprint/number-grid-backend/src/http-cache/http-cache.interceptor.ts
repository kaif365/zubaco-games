import {
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
    const cacheKey = `http-cache:${prefix}:${request.url}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: ${cacheKey}`);
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
