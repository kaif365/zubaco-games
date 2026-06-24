import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, boolean> = { db: false, redis: false };

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      checks.db = true;
    } catch {}

    try {
      await this.redis.set('health_check', '1', 5);
      checks.redis = true;
    } catch {}

    const healthy = checks.db && checks.redis;
    return {
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
