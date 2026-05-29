import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Apply strict rate limiting to sensitive endpoints.
 * Default: 10 requests per 60 seconds per IP.
 */
export const StrictRateLimit = (limit = 10, ttl = 60000) =>
  applyDecorators(Throttle({ default: { limit, ttl } }));

/**
 * Apply relaxed rate limiting for read-heavy endpoints.
 * Default: 120 requests per 60 seconds per IP.
 */
export const RelaxedRateLimit = (limit = 120, ttl = 60000) =>
  applyDecorators(Throttle({ default: { limit, ttl } }));
