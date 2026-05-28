import { SetMetadata } from '@nestjs/common';

export const CACHE_INVALIDATE_METADATA = 'cache:invalidate';

/**
 * Decorator to invalidate cache entries after a mutation (POST/PUT/DELETE).
 * @param patterns - Cache key patterns to invalidate (e.g., 'cache:leaderboard:*')
 */
export function CacheInvalidate(...patterns: string[]) {
  return SetMetadata(CACHE_INVALIDATE_METADATA, patterns);
}
