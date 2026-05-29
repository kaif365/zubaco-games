import { config } from '@config';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisSession {
    userId: string | null;
    adminId: string | null;
    userType: number;
    expiresAt: string;
}

export interface RedisUser {
    id: string;
    name: string;
    createdAt: string;
    stageId: string;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    /**
     * Handle on module init.
     */
    onModuleInit() {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            username: config.redis.username,
            password: config.redis.password,
            db: config.redis.db,
            lazyConnect: true,
        });

        this.client.on('error', (err) => this.logger.error('Redis error', err));
        void this.client.connect().then(() => {
            this.logger.log(`Redis connected (db=${config.redis.db})`);
        });
    }

    /**
     * Handle on module destroy.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async onModuleDestroy() {
        await this.client.quit();
    }

    // ── Sessions ─────────────────────────────────────────────────────────────

    /**
     * Set session.
     *
     * @param {string} sessionId - session id value.
     * @param {RedisSession} data - data value.
     * @param {number} ttlSeconds - ttl seconds value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async setSession(sessionId: string, data: RedisSession, ttlSeconds: number): Promise<void> {
        await this.client.set(
            `${config.redis.arrowsProjectKey}:session:${sessionId}`,
            JSON.stringify(data),
            'EX',
            ttlSeconds,
        );
    }

    /**
     * Get session.
     *
     * @param {string} sessionId - session id value.
     *
     * @returns {Promise<RedisSession | null>} The asynchronous result.
     */
    async getSession(sessionId: string): Promise<RedisSession | null> {
        const raw = await this.client.get(`${config.redis.arrowsProjectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisSession;
    }

    /**
     * Delete session.
     *
     * @param {string} sessionId - session id value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async deleteSession(sessionId: string): Promise<void> {
        await this.client.del(`${config.redis.arrowsProjectKey}:session:${sessionId}`);
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    /**
     * Set user.
     *
     * @param {string} userId - user id value.
     * @param {RedisUser} data - data value.
     * @param {number} ttlSeconds - ttl seconds value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async setUser(userId: string, data: RedisUser, ttlSeconds?: number): Promise<void> {
        const key = `${config.redis.arrowsProjectKey}:user:${userId}`;
        if (ttlSeconds) {
            await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        } else {
            await this.client.set(key, JSON.stringify(data));
        }
    }

    /**
     * Get user.
     *
     * @param {string} userId - user id value.
     *
     * @returns {Promise<RedisUser | null>} The asynchronous result.
     */
    async getUser(userId: string): Promise<RedisUser | null> {
        const raw = await this.client.get(`${config.redis.arrowsProjectKey}:user:${userId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisUser;
    }

    /**
     * Delete user.
     *
     * @param {string} userId - user id value.
     *
     * @returns {Promise<void>} Resolves when the operation completes.
     */
    async deleteUser(userId: string): Promise<void> {
        await this.client.del(`${config.redis.arrowsProjectKey}:user:${userId}`);
    }

    // ── Users (users-project-key-prefixed, read-only) ────────────────────────

    /**
     * Get users session.
     *
     * @param {string} sessionId - session id value.
     *
     * @returns {Promise<{ userId: string; userType: number; expiresAt: string } | null>} The asynchronous result.
     */
    async getUsersSession(
        sessionId: string,
    ): Promise<{ userId: string; userType: number; expiresAt: string } | null> {
        const raw = await this.client.get(`${config.redis.usersProjectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as { userId: string; userType: number; expiresAt: string };
    }

    /**
     * Get users user.
     *
     * @param {string} userId - user id value.
     *
     * @returns {Promise<RedisUser | null>} The asynchronous result.
     */
    async getUsersUser(userId: string): Promise<RedisUser | null> {
        const raw = await this.client.get(`${config.redis.usersProjectKey}:user:${userId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisUser;
    }

    // ── Admin (admin-project-key-prefixed, read-only) ─────────────────────────

    /**
     * Get project session.
     *
     * @param {string} sessionId - session id value.
     *
     * @returns {Promise<RedisSession | null>} The asynchronous result.
     */
    async getProjectSession(sessionId: string): Promise<RedisSession | null> {
        const raw = await this.client.get(`${config.redis.adminProjectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisSession;
    }

    /**
     * Get project admin.
     *
     * @param {string} adminId - admin id value.
     *
     * @returns {Promise<{ id: string; email: string; createdAt: string; updatedAt: string; deletedAt: string | null; } | null>} The asynchronous result.
     */
    async getProjectAdmin(adminId: string): Promise<{
        id: string;
        email: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    } | null> {
        const raw = await this.client.get(`${config.redis.adminProjectKey}:admin:${adminId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as {
            id: string;
            email: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        };
    }
}
