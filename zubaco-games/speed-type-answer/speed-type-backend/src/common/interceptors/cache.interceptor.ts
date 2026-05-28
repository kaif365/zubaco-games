import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RedisService } from '../../redis/redis.service';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator';

/**
 * Intercepts GET requests decorated with @Cacheable() and serves from Redis cache.
 * Cache-aside pattern: check cache → miss → execute handler → store result.
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const prefix = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    if (!prefix) {
      return next.handle();
    }

    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) || 60;
    const cacheKey = `cache:${prefix}:${request.url}`;

    // Try cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap((response) => {
        void this.redis.set(cacheKey, JSON.stringify(response), ttl);
      }),
    );
  }
}
