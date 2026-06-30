import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { config } from '../../config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Shared ban-cache contract (M8). `EnforcementService` proactively writes this
 * key on ban ('1') and reversal ('0') so the effect is immediate; the strategy
 * falls back to the authoritative `User.is_banned` column on a cache miss and
 * back-fills the cache. The DB column remains the source of truth, so a Redis
 * flush can never let a banned user through for longer than the short TTL.
 */
export const AUTH_BAN_CACHE_PREFIX = 'auth:ban:';
export const AUTH_BAN_CACHE_TTL_SECONDS = 60;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.accessSecret,
    });
  }

  /**
   * Authoritative per-request ban enforcement (M8): a structurally-valid,
   * unexpired access token is rejected the moment its user is banned — without
   * waiting for refresh-token expiry. Backed by `User.is_banned` (source of
   * truth) with a short-lived Redis cache so the common path stays a fast
   * in-memory check.
   */
  async validate(payload: { sub: string }) {
    const userId = payload.sub;
    const cacheKey = `${AUTH_BAN_CACHE_PREFIX}${userId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached === '1') {
      throw new ForbiddenException('Account is banned');
    }
    if (cached !== '0') {
      // Cache miss → consult the authoritative column and back-fill the cache.
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { is_banned: true },
      });
      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }
      await this.redis.set(cacheKey, user.is_banned ? '1' : '0', AUTH_BAN_CACHE_TTL_SECONDS);
      if (user.is_banned) {
        throw new ForbiddenException('Account is banned');
      }
    }

    return { userId };
  }
}
