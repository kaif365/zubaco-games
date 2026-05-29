import { config } from "@config";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import Redis from "ioredis";

export interface RedisUserSession {
  userId: string;
  userType: number;
  expiresAt: string;
}

export interface RedisUserProfile {
  id: string;
  name?: string;
  createdAt?: string;
  stageId: string;
}

export interface RedisAdminSession {
  adminId: string;
  expiresAt?: string;
}

export interface RedisAdminProfile {
  id: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/**
 * Redis access layer for cached user and admin session/profile lookups.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  /**
   * Handle on module init.
   *
   * @returns {void} Resolves when the operation completes.
   */
  onModuleInit(): void {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username,
      password: config.redis.password,
      db: config.redis.db,
      lazyConnect: true,
    });

    this.client.on("error", (error) => {
      this.logger.error("Redis error", error);
    });

    void this.client.connect().then(() => {
      this.logger.log(`Redis connected (db=${config.redis.db})`);
    });
  }

  /**
   * Handle on module destroy.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Handle get users session.
   *
   * @param {string} sessionId - session id value.
   *
   * @returns {Promise<RedisUserSession | null>} The asynchronous result.
   */
  async getUsersSession(sessionId: string): Promise<RedisUserSession | null> {
    const raw = await this.client.get(
      `${config.redis.usersProjectKey}:session:${sessionId}`,
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RedisUserSession;
  }

  /**
   * Handle get users user.
   *
   * @param {string} userId - user id value.
   *
   * @returns {Promise<RedisUserProfile | null>} The asynchronous result.
   */
  async getUsersUser(userId: string): Promise<RedisUserProfile | null> {
    const raw = await this.client.get(
      `${config.redis.usersProjectKey}:user:${userId}`,
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RedisUserProfile;
  }

  /**
   * Handle get project session.
   *
   * @param {string} sessionId - session id value.
   *
   * @returns {Promise<RedisAdminSession | null>} The asynchronous result.
   */
  async getProjectSession(
    sessionId: string,
  ): Promise<RedisAdminSession | null> {
    const raw = await this.client.get(
      `${config.redis.adminProjectKey}:session:${sessionId}`,
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RedisAdminSession;
  }

  /**
   * Handle get project admin.
   *
   * @param {string} adminId - admin id value.
   *
   * @returns {Promise<RedisAdminProfile | null>} The asynchronous result.
   */
  async getProjectAdmin(adminId: string): Promise<RedisAdminProfile | null> {
    const raw = await this.client.get(
      `${config.redis.adminProjectKey}:admin:${adminId}`,
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RedisAdminProfile;
  }
}
