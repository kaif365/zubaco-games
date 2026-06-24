import { config } from '@config';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Session data cached in Redis.
 */
export interface RedisSession {
    adminId: string;
    userType: number;
    expiresAt: string;
}

export interface RedisAdmin {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    async onModuleInit() {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            username: config.redis.username,
            password: config.redis.password,
            db: config.redis.db,
            lazyConnect: true,
        });

        this.client.on('error', (err) => this.logger.error('Redis error', err));

        try {
            await this.client.connect();
            this.logger.log(`Redis connected (db=${config.redis.db})`);
        } catch (error) {
            this.logger.error(
                'Redis connection failed; DB token fallback remains available',
                error,
            );
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }

    // ── Sessions ─────────────────────────────────────────────────────────────

    async setSession(sessionId: string, data: RedisSession, ttlSeconds: number): Promise<void> {
        await this.client.set(
            `${config.redis.adminProjectKey}:session:${sessionId}`,
            JSON.stringify(data),
            'EX',
            ttlSeconds,
        );
    }

    async getSession(sessionId: string): Promise<RedisSession | null> {
        const raw = await this.client.get(`${config.redis.adminProjectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisSession;
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.client.del(`${config.redis.adminProjectKey}:session:${sessionId}`);
    }

    // ── Admins ────────────────────────────────────────────────────────────────

    async setAdmin(adminId: string, data: RedisAdmin, ttlSeconds?: number): Promise<void> {
        const key = `${config.redis.adminProjectKey}:admin:${adminId}`;
        if (ttlSeconds) {
            await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        } else {
            await this.client.set(key, JSON.stringify(data));
        }
    }

    async getAdmin(adminId: string): Promise<RedisAdmin | null> {
        const raw = await this.client.get(`${config.redis.adminProjectKey}:admin:${adminId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisAdmin;
    }

    async deleteAdmin(adminId: string): Promise<void> {
        await this.client.del(`${config.redis.adminProjectKey}:admin:${adminId}`);
    }
}
