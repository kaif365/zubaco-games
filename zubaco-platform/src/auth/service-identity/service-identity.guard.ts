import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import {
  loadServiceRegistry,
  ServiceRegistry,
  canonicalString,
  hashBody,
  verifySignature,
  MAX_CLOCK_SKEW_MS,
} from './service-identity';

/**
 * ServiceIdentityGuard — enterprise replacement for InternalApiGuard (AUTH-003).
 *
 * Verifies per-service signed requests: x-service-id, x-timestamp, x-nonce,
 * x-signature. Enforces a clock-skew window and single-use nonces (replay
 * protection) via Redis. Legacy x-internal-api-key is accepted only while
 * SERVICE_IDENTITY_ENFORCE !== 'true' (rotation window), then removed.
 */
@Injectable()
export class ServiceIdentityGuard implements CanActivate {
  private readonly registry: ServiceRegistry;
  private readonly enforce: boolean;
  private readonly legacyKey?: string;

  constructor(private readonly redis: RedisService) {
    this.registry = loadServiceRegistry(process.env.SERVICE_IDENTITY_KEYS);
    this.enforce = process.env.SERVICE_IDENTITY_ENFORCE === 'true';
    this.legacyKey = process.env.INTERNAL_API_KEY;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const serviceId = req.headers['x-service-id'] as string | undefined;
    const timestamp = req.headers['x-timestamp'] as string | undefined;
    const nonce = req.headers['x-nonce'] as string | undefined;
    const signature = req.headers['x-signature'] as string | undefined;

    if (serviceId && timestamp && nonce && signature) {
      const pair = this.registry[serviceId];
      if (!pair) throw new UnauthorizedException('Unknown service identity');

      const ts = Number(timestamp);
      if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
        throw new UnauthorizedException('Signature timestamp outside window');
      }

      const canonical = canonicalString(
        serviceId,
        req.method,
        req.originalUrl ?? req.url,
        timestamp,
        nonce,
        hashBody(req.body),
      );
      if (!verifySignature(pair, canonical, signature)) {
        throw new UnauthorizedException('Invalid service signature');
      }

      const nonceKey = `svcid:nonce:${serviceId}:${nonce}`;
      const fresh = await this.redis.setnx(nonceKey, '1');
      if (!fresh) throw new UnauthorizedException('Replay detected');
      await this.redis.expire(nonceKey, 120);

      req.serviceIdentity = serviceId;
      return true;
    }

    if (!this.enforce && this.legacyKey && req.headers['x-internal-api-key'] === this.legacyKey) {
      return true;
    }
    throw new UnauthorizedException('Service identity required');
  }
}
