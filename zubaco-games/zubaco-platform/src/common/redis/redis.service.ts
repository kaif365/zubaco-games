import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../../config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
      reconnectOnError: (err: Error) => {
        const target = 'READONLY';
        return err.message.includes(target);
      },
    });

    // Prevent unhandled 'error' events from crashing the process
    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
    this.client.on('reconnecting', (delay: number) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
    this.client.on('ready', () => {
      this.logger.log('Redis connection ready');
    });
  }

  /**
   * Acquire a distributed lock using SET NX with expiry.
   * Returns true if the lock was acquired (caller is the single leader for `ttlSeconds`).
   * Used to guarantee scheduled jobs run on exactly one instance.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
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

  /**
   * Atomic increment-by-amount. Returns the value after incrementing. Used to
   * accumulate risk points without the non-atomic read-modify-write race of a
   * manual get+set (ACHEAT-VAL-02).
   */
  async incrby(key: string, amount: number): Promise<number> {
    return this.client.incrby(key, amount);
  }

  /**
   * Remaining TTL for a key in seconds. Returns -1 if the key exists with no
   * expiry, or -2 if the key does not exist.
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  /**
   * Atomic "update only if greater" using Redis ZADD GT (Redis 6.2+).
   * Sets member's score to `score` only when it is strictly greater than the
   * current score (or the member does not yet exist). Avoids the non-atomic
   * read-then-write race of a manual zscore+zadd (SCORE-LB-01).
   */
  async zaddGt(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, 'GT', score, member);
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

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
