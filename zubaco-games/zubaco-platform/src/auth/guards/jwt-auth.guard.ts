import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, let Passport validate the JWT signature + expiry
    const result = await super.canActivate(context);
    if (!result) return false;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid token payload');

    // Check ban status (cached in Redis for performance — 60s TTL)
    const banCacheKey = `ban_check:${userId}`;
    const cached = await this.redis.get(banCacheKey);

    if (cached === 'banned') {
      throw new ForbiddenException('Your account has been suspended');
    }

    if (cached === 'active') {
      return true; // User is known-good, skip DB check
    }

    // Cache miss — check DB
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { is_banned: true, deleted_at: true },
    });

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    if (user.deleted_at) {
      throw new UnauthorizedException('Account has been deleted');
    }

    if (user.is_banned) {
      await this.redis.set(banCacheKey, 'banned', 60);
      throw new ForbiddenException('Your account has been suspended');
    }

    // Cache as active for 60 seconds
    await this.redis.set(banCacheKey, 'active', 60);
    return true;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
