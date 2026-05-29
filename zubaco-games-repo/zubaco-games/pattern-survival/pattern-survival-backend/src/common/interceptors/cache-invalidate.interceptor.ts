import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RedisService } from '../../redis/redis.service';
import { CACHE_INVALIDATE_METADATA } from '../decorators/cache-invalidate.decorator';

/**
 * Intercepts mutation requests decorated with @CacheInvalidate() and
 * clears matching Redis keys after successful execution.
 */
@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const patterns = this.reflector.get<string[]>(
      CACHE_INVALIDATE_METADATA,
      context.getHandler(),
    );

    if (!patterns || patterns.length === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        for (const pattern of patterns) {
          void this.redis.delPattern(pattern);
        }
      }),
    );
  }
}
