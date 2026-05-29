import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * Decorator to cache GET endpoint responses in Redis.
 * @param prefix - Cache key prefix (e.g., 'leaderboard')
 * @param ttlSeconds - Time-to-live in seconds (default: 60)
 */
export function Cacheable(prefix: string, ttlSeconds = 60) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, prefix)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttlSeconds)(target, propertyKey, descriptor);
    return descriptor;
  };
}
