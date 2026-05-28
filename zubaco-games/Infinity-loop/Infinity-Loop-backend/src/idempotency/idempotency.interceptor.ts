import {
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

    const cacheKey = `idem:${idempotencyKey}`;

    // Check if we already processed this request
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const response: CachedResponse = JSON.parse(cached);
      this.logger.debug(`Idempotent hit: ${idempotencyKey}`);
      const res = context.switchToHttp().getResponse();
      res.status(response.statusCode);
      return of(response.body);
    }

    // Lock to prevent concurrent duplicate processing
    const lockKey = `idem-lock:${idempotencyKey}`;
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
