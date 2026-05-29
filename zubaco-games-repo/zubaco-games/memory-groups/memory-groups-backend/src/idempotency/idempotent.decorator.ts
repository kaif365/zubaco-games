import { SetMetadata, applyDecorators } from '@nestjs/common';
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
