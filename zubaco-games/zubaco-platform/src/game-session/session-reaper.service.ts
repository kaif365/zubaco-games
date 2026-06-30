import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { MAX_SESSION_DURATION_MS, SESSION_STALE_GRACE_MS } from './constants';

/**
 * Sweeps abandoned game sessions. A session that was never submitted (outcome
 * still null) and whose start time is older than the maximum allowed play
 * duration plus a grace window can never be legitimately completed, so it is
 * marked TIMED_OUT. This prevents orphaned open sessions from accumulating and
 * gives SessionOutcome.TIMED_OUT a writer.
 */
@Injectable()
export class SessionReaperService {
  private readonly logger = new Logger(SessionReaperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Cron('*/5 * * * *')
  async reapStaleSessions(): Promise<void> {
    // Redis lock prevents concurrent reaping across multiple instances.
    if (!(await this.redis.acquireLock('lock:cron:reapStaleSessions', 290))) return;

    const cutoff = new Date(Date.now() - (MAX_SESSION_DURATION_MS + SESSION_STALE_GRACE_MS));

    try {
      const result = await this.prisma.gameSession.updateMany({
        where: { outcome: null, started_at: { lt: cutoff } },
        data: { outcome: 'TIMED_OUT', completed_at: new Date() },
      });

      if (result.count > 0) {
        this.logger.log(`Reaped ${result.count} stale game session(s) -> TIMED_OUT`);
      }
    } catch (err) {
      this.logger.error(`Session reaper failed: ${(err as Error).message}`);
    }
  }
}
