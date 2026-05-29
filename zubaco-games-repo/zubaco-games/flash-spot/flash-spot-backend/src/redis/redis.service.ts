import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;

    this.client = new Redis({
      host,
      port,
      username: process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB) || 0,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('error', (err) => this.logger.error('Redis connection error', err.message));

    void this.client.connect().then(() => {
      this.logger.log(`Redis connected (${host}:${port})`);
    }).catch((err) => {
      this.logger.warn(`Redis unavailable: ${err.message}. Caching disabled.`);
    });
  }

  async onModuleDestroy() {
    if (this.client?.status === 'ready') {
      await this.client.quit();
    }
  }

  /** Check if Redis is connected and healthy */
  isHealthy(): boolean {
    return this.client?.status === 'ready';
  }

  /** Get a value by key */
  async get(key: string): Promise<string | null> {
    if (!this.isHealthy()) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  /** Get and parse JSON value */
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Set a value with optional TTL (seconds) */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isHealthy()) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Cache write failure is non-critical
    }
  }

  /** Set a JSON value with optional TTL (seconds) */
  async setJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /** Delete a key */
  async del(key: string): Promise<void> {
    if (!this.isHealthy()) return;
    try {
      await this.client.del(key);
    } catch {
      // Non-critical
    }
  }

  /** Delete keys matching a pattern */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isHealthy()) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // Non-critical
    }
  }

  /** Increment a counter */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isHealthy()) return 0;
    try {
      const val = await this.client.incr(key);
      if (ttlSeconds && val === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return val;
    } catch {
      return 0;
    }
  }

  /** Get the underlying Redis client for advanced operations */
  getClient(): Redis {
    return this.client;
  }
}
