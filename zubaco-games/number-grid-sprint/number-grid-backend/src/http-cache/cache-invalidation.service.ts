import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private redis: Redis | null = null;

  constructor() {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
      this.redis.connect().catch(() => { this.redis = null; });
    } catch {
      this.redis = null;
    }
  }

  async invalidateByPrefix(prefix: string): Promise<number> {
    if (!this.redis) return 0;
    const keys = await this.redis.keys(`http-cache:${prefix}:*`);
    if (keys.length === 0) return 0;
    const deleted = await this.redis.del(...keys);
    this.logger.log(`Invalidated ${deleted} cached entries for prefix: ${prefix}`);
    return deleted;
  }

  async invalidateByUrl(url: string): Promise<void> {
    if (!this.redis) return;
    const keys = await this.redis.keys(`http-cache:*:${url}`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async flushAll(): Promise<void> {
    if (!this.redis) return;
    const keys = await this.redis.keys('http-cache:*');
    if (keys.length > 0) await this.redis.del(...keys);
    this.logger.warn('All HTTP cache flushed');
  }
}
