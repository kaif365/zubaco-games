import { SetMetadata, applyDecorators } from '@nestjs/common';
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
