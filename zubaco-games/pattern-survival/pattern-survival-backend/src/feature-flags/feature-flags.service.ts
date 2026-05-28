import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  updatedAt?: string;
}

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private redis: Redis | null = null;
  private readonly localCache = new Map<string, boolean>();
  private readonly REDIS_PREFIX = 'ff:';
  private readonly CACHE_TTL_MS = 30_000; // 30s local cache
  private lastRefresh = 0;

  async onModuleInit(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      await this.redis.connect();
      await this.refreshCache();
      this.logger.log('Feature flags service initialized');
    } catch (err) {
      this.logger.warn('Redis unavailable for feature flags — using defaults');
      this.redis = null;
    }
  }

  async isEnabled(flagName: string, defaultValue = false): Promise<boolean> {
    // Check local cache first
    if (Date.now() - this.lastRefresh < this.CACHE_TTL_MS && this.localCache.has(flagName)) {
      return this.localCache.get(flagName)!;
    }

    if (!this.redis) return defaultValue;

    try {
      const value = await this.redis.get(`${this.REDIS_PREFIX}${flagName}`);
      if (value === null) return defaultValue;
      const enabled = value === '1' || value === 'true';
      this.localCache.set(flagName, enabled);
      return enabled;
    } catch {
      return this.localCache.get(flagName) ?? defaultValue;
    }
  }

  async setFlag(flagName: string, enabled: boolean): Promise<void> {
    if (!this.redis) {
      this.localCache.set(flagName, enabled);
      return;
    }

    await this.redis.set(`${this.REDIS_PREFIX}${flagName}`, enabled ? '1' : '0');
    this.localCache.set(flagName, enabled);
    this.logger.log(`Feature flag "${flagName}" set to ${enabled}`);
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    if (!this.redis) {
      return Array.from(this.localCache.entries()).map(([name, enabled]) => ({ name, enabled }));
    }

    try {
      const keys = await this.redis.keys(`${this.REDIS_PREFIX}*`);
      if (keys.length === 0) return [];

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();

      return keys.map((key, i) => ({
        name: key.replace(this.REDIS_PREFIX, ''),
        enabled: results?.[i]?.[1] === '1' || results?.[i]?.[1] === 'true',
      }));
    } catch {
      return [];
    }
  }

  private async refreshCache(): Promise<void> {
    const flags = await this.getAllFlags();
    flags.forEach((f) => this.localCache.set(f.name, f.enabled));
    this.lastRefresh = Date.now();
  }
}
