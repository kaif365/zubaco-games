import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
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

  /**
   * OPS-S2 (O2): LIVENESS. Answers "is the process alive?" only — it must NOT
   * touch DB/Redis, otherwise a transient dependency blip would make the
   * orchestrator (ECS/Kubernetes) kill and restart an otherwise-healthy pod.
   * Always 200 while the event loop is responsive.
   */
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * OPS-S2 (O2): READINESS. Answers "can this instance serve traffic?" — checks
   * the critical dependencies (Postgres + Redis) and returns HTTP 503 when any
   * is down so the load balancer stops routing to this instance until it
   * recovers, without the process being restarted.
   */
  @Get('ready')
  async ready() {
    const checks: Record<string, boolean> = { db: false, redis: false };

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      checks.db = true;
    } catch {}

    try {
      await this.redis.set('health_check', '1', 5);
      checks.redis = true;
    } catch {}

    if (!checks.db || !checks.redis) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return { status: 'ready', checks, timestamp: new Date().toISOString() };
  }
}
