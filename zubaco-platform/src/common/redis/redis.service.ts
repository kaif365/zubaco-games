import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../../config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
      // OPS-S2 (O-Redis): explicit, bounded reconnect. ioredis auto-reconnects on
      // a dropped connection; cap the backoff at 2s so a Redis blip recovers fast
      // without a thundering-herd of instant retries.
      retryStrategy: (times) => Math.min(times * 100, 2000),
      enableReadyCheck: true,
    });
    // Prevent an unhandled 'error' event from crashing the process during a
    // transient Redis outage; ioredis keeps retrying in the background.
    this.client.on('error', () => {});
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /** Atomic set-if-absent. Returns true when the key was created. */
  async setnx(key: string, value: string): Promise<boolean> {
    return (await this.client.setnx(key, value)) === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    return this.client.zrevrank(key, member);
  }

  async zrevrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) {
      return this.client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrevrange(key, start, stop);
  }

  async zscore(key: string, member: string): Promise<string | null> {
    return this.client.zscore(key, member);
  }

  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    limit?: number,
  ): Promise<string[]> {
    if (limit !== undefined) {
      return this.client.zrangebyscore(key, min, max, 'LIMIT', 0, limit);
    }
    return this.client.zrangebyscore(key, min, max);
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.client.zrem(key, member);
  }

  async onModuleDestroy() {
    // OPS-S2 (O1): quit() flushes pending commands and closes the connection
    // gracefully (vs disconnect() which drops it abruptly), so an in-flight
    // command during shutdown is not lost.
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
