import { config } from '@config';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Session data cached in Redis.
 * userType matches USER_TYPES numeric constants (1 = user, 2 = admin).
 */
export interface RedisSession {
    userId: string | null;
    adminId: string | null;
    userType: number;
    expiresAt: string; // ISO string — re-validated by guard even though Redis TTL handles eviction
}

/**
 * Minimal user data stored in Redis (no user table in DB).
 */
export interface RedisUser {
    id: string;
    name: string;
    createdAt: string; // ISO string
    stageId: string;
}

/**
 * Parse json.
 *
 * @param {string} value - The value.
 *
 * @returns {T} The result of parseJson.
 */
function parseJson<T>(value: string): T {
    return JSON.parse(value) as T;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    /**
     * On module init.
     *
     * @returns {void} No return value.
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
     * On module destroy.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    async onModuleDestroy() {
        await this.client.quit();
    }

    // ── User auth local cache (sequenceRecallProjectKey-prefixed, writable) ────

    /**
     * Cache user auth data fetched from the users microservice HTTP fallback.
     * TTL is intentionally short — this is a local read-through cache only.
     *
     * @param {string} sessionId - The session id.
     * @param {RedisUser} data - The user data.
     * @param {number} ttlSeconds - Cache lifetime in seconds.
     *
     * @returns {Promise<void>}
     */
    async setUserAuth(sessionId: string, data: RedisUser, ttlSeconds = 60): Promise<void> {
        await this.client.set(
            `${config.redis.sequenceRecallProjectKey}:user_auth:${sessionId}`,
            JSON.stringify(data),
            'EX',
            ttlSeconds,
        );
    }

    /**
     * Read locally cached user auth data.
     *
     * @param {string} sessionId - The session id.
     *
     * @returns {Promise<RedisUser | null>}
     */
    async getUserAuth(sessionId: string): Promise<RedisUser | null> {
        const raw = await this.client.get(
            `${config.redis.sequenceRecallProjectKey}:user_auth:${sessionId}`,
        );
        if (!raw) {
            return null;
        }
        return parseJson<RedisUser>(raw);
    }

    // ── Users (users-project-key-prefixed, read-only) ────────────────────────

    /**
     * Gets users session.
     *
     * @param {string} sessionId - The session id.
     *
     * @returns {Promise<{ userId: string; userType: number; expiresAt: string; } | null>} A promise that resolves with the result.
     */
    async getUsersSession(
        sessionId: string,
    ): Promise<{ userId: string; userType: number; expiresAt: string } | null> {
        const raw = await this.client.get(`${config.redis.usersProjectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return parseJson<{ userId: string; userType: number; expiresAt: string }>(raw);
    }

    /**
     * Gets users user.
     *
     * @param {string} userId - The user id.
     *
     * @returns {Promise<RedisUser | null>} A promise that resolves with the result.
     */
    async getUsersUser(userId: string): Promise<RedisUser | null> {
        const raw = await this.client.get(`${config.redis.usersProjectKey}:user:${userId}`);
        if (!raw) {
            return null;
        }
        return parseJson<RedisUser>(raw);
    }

    // ── Admin (admin-project-key-prefixed, read-only) ─────────────────────────

    /**
     * Gets project session.
     *
     * @param {string} sessionId - The session id.
     *
     * @returns {Promise<RedisSession | null>} A promise that resolves with the result.
     */
    async getProjectSession(sessionId: string): Promise<RedisSession | null> {
        const raw = await this.client.get(`${config.redis.adminProjectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return parseJson<RedisSession>(raw);
    }

    /**
     * Gets project admin.
     *
     * @param {string} adminId - The admin id.
     *
     * @returns {Promise<{ id: string; email: string; createdAt: string; updatedAt: string; deletedAt: string | null; } | null>} A promise that resolves with the result.
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
        return parseJson<{
            id: string;
            email: string;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        }>(raw);
    }
}
