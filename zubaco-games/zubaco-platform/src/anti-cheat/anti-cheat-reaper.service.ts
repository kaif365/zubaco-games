import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../common/redis/redis.service';
import { AntiCheatService } from './anti-cheat.service';

/**
 * Sweeps expired temporary bans. A tier-4 temp ban relies on a 24h
 * `tempban:<id>` Redis key, but nothing consumes that key when it expires, so
 * without this reaper a temp-banned user would stay banned forever
 * (ACHEAT-VAL-01). Runs every 5 minutes behind a Redis lock so it executes on
 * exactly one instance.
 */
@Injectable()
export class AntiCheatReaperService {
  private readonly logger = new Logger(AntiCheatReaperService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly antiCheat: AntiCheatService,
  ) {}

  @Cron('*/5 * * * *')
  async reapExpiredTempBans(): Promise<void> {
    // Redis lock prevents concurrent reaping across multiple instances.
    if (!(await this.redis.acquireLock('lock:cron:reapExpiredTempBans', 290))) return;

    try {
      await this.antiCheat.reapExpiredTempBans();
    } catch (err) {
      this.logger.error(`Temp-ban reaper failed: ${(err as Error).message}`);
    }
  }
}
