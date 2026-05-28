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
}

export interface BlockFillGameState {
    gameType: 'BLOCK_FILL';
    boardId: string;
    gridX: number;
    gridY: number;
    totalPairs: number;
    startedAtMs: number;
    timeLimitSeconds: number;
}

export type GameState = BlockFillGameState;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    /**
     * Initializes the Redis client and opens the connection.
     * @returns {void} Nothing.
     */
    onModuleInit(): void {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
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
     * Gracefully closes the Redis connection when the module shuts down.
     * @returns {Promise<void>} A promise that resolves when the client is disconnected.
     */
    async onModuleDestroy() {
        await this.client.quit();
    }

    // ── Sessions ─────────────────────────────────────────────────────────────

    /**
     * Stores a user or admin session in Redis with a TTL.
     * @param {string} sessionId - The session identifier.
     * @param {RedisSession} data - The session payload to store.
     * @param {number} ttlSeconds - The session expiry time in seconds.
     * @returns {Promise<void>} A promise that resolves when the session is stored.
     */
    async setSession(sessionId: string, data: RedisSession, ttlSeconds: number): Promise<void> {
        await this.client.set(
            `${config.redis.projectKey}:session:${sessionId}`,
            JSON.stringify(data),
            'EX',
            ttlSeconds,
        );
    }

    /**
     * Fetches a cached session from Redis.
     * @param {string} sessionId - The session identifier.
     * @returns {Promise<RedisSession | null>} The cached session or null when not found.
     */
    async getSession(sessionId: string): Promise<RedisSession | null> {
        const raw = await this.client.get(`${config.redis.projectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisSession;
    }

    /**
     * Deletes a cached session from Redis.
     * @param {string} sessionId - The session identifier.
     * @returns {Promise<void>} A promise that resolves when the session is deleted.
     */
    async deleteSession(sessionId: string): Promise<void> {
        await this.client.del(`${config.redis.projectKey}:session:${sessionId}`);
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    /**
     * Stores a cached user profile in Redis.
     * @param {string} userId - The user identifier.
     * @param {RedisUser} data - The user payload to store.
     * @param {number} [ttlSeconds] - The optional expiry time in seconds.
     * @returns {Promise<void>} A promise that resolves when the user is stored.
     */
    async setUser(userId: string, data: RedisUser, ttlSeconds?: number): Promise<void> {
        const key = `${config.redis.projectKey}:user:${userId}`;
        if (ttlSeconds) {
            await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        } else {
            await this.client.set(key, JSON.stringify(data));
        }
    }

    /**
     * Fetches a cached user profile from Redis.
     * @param {string} userId - The user identifier.
     * @returns {Promise<RedisUser | null>} The cached user or null when not found.
     */
    async getUser(userId: string): Promise<RedisUser | null> {
        const raw = await this.client.get(`${config.redis.projectKey}:user:${userId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisUser;
    }

    /**
     * Deletes a cached user profile from Redis.
     * @param {string} userId - The user identifier.
     * @returns {Promise<void>} A promise that resolves when the user is deleted.
     */
    async deleteUser(userId: string): Promise<void> {
        await this.client.del(`${config.redis.projectKey}:user:${userId}`);
    }

    // ── Game State ────────────────────────────────────────────────────────────

    /**
     * Stores serialized game state in Redis with a TTL.
     * @param {string} gameSessionId - The game session identifier.
     * @param {GameState} state - The game state payload to store.
     * @param {number} ttlSeconds - The expiry time in seconds.
     * @returns {Promise<void>} A promise that resolves when the game state is stored.
     */
    async setGameState(gameSessionId: string, state: GameState, ttlSeconds: number): Promise<void> {
        await this.client.set(
            `${config.redis.projectKey}:game:state:${gameSessionId}`,
            JSON.stringify(state),
            'EX',
            ttlSeconds,
        );
    }

    /**
     * Fetches serialized game state from Redis.
     * @param {string} gameSessionId - The game session identifier.
     * @returns {Promise<GameState | null>} The cached game state or null when not found.
     */
    async getGameState(gameSessionId: string): Promise<GameState | null> {
        const raw = await this.client.get(`${config.redis.projectKey}:game:state:${gameSessionId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as GameState;
    }

    /**
     * Deletes serialized game state from Redis.
     * @param {string} gameSessionId - The game session identifier.
     * @returns {Promise<void>} A promise that resolves when the game state is deleted.
     */
    async deleteGameState(gameSessionId: string): Promise<void> {
        await this.client.del(`${config.redis.projectKey}:game:state:${gameSessionId}`);
    }

    // ── Admin (admin-project-key-prefixed, read-only) ─────────────────────────

    /**
     * Fetches a project-scoped admin session from the admin Redis namespace.
     * @param {string} sessionId - The admin session identifier.
     * @returns {Promise<RedisSession | null>} The cached admin session or null when not found.
     */
    async getProjectSession(sessionId: string): Promise<RedisSession | null> {
        const raw = await this.client.get(`${config.redis.adminProjectKey}:session:${sessionId}`);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as RedisSession;
    }

    /**
     * Fetches a cached admin profile from the admin Redis namespace.
     * @param {string} adminId - The admin identifier.
     * @returns {Promise<{ id: string; email: string; createdAt: string; updatedAt: string; deletedAt: string | null; } | null>} The cached admin profile or null when not found.
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
