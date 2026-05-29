import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";

import {
  RedisAdminProfile,
  RedisAdminSession,
  RedisService,
} from "../redis/redis.service";

import { AdminData, AdminHttpService } from "./http/admin-http.service";

/**
 * Verifies admin identity for incoming requests.
 *
 * Flow:
 * 1. Fetch session data from Redis
 * 2. Cross-check session.adminId === adminId from the token payload
 * 3. Fetch admin profile from Redis
 * 4. Both hits -> return admin data (fast path, Redis TTL handles expiry)
 * 5. Either miss OR Redis down -> fall back to the admin auth service
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  /**
   * Create a new instance.
   *
   * @param {RedisService} redis - redis value.
   * @param {AdminHttpService} adminHttp - admin http value.
   */
  constructor(
    private readonly redis: RedisService,
    private readonly adminHttp: AdminHttpService,
  ) {}

  /**
   * Handle verify admin.
   *
   * @param {string} sessionId - session id value.
   * @param {string} adminId - admin id value.
   * @param {string} token - token value.
   *
   * @returns {Promise<AdminData>} The asynchronous result.
   */
  async verifyAdmin(
    sessionId: string,
    adminId: string,
    token: string,
  ): Promise<AdminData> {
    try {
      const session = await this.redis.getProjectSession(sessionId);

      if (session) {
        this.validateSession(session, adminId);

        const admin = await this.redis.getProjectAdmin(adminId);
        if (admin?.id) {
          return this.toAdminData(admin);
        }
      }

      this.logger.debug(
        `Admin Redis cache miss - sessionId=${sessionId}, falling back to HTTP`,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn(
        `Redis unreachable during admin verification: ${(error as Error).message}`,
      );
    }

    return this.adminHttp.checkAuthenticated(token);
  }

  /**
   * Handle validate session.
   *
   * @param {RedisAdminSession} session - session value.
   * @param {string} adminId - admin id value.
   *
   * @returns {void} Resolves when the operation completes.
   */
  private validateSession(session: RedisAdminSession, adminId: string): void {
    if (session.adminId !== adminId) {
      throw new UnauthorizedException("TOKEN_INVALID");
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      throw new UnauthorizedException("INVALID_SESSION");
    }
  }

  /**
   * Handle to admin data.
   *
   * @param {RedisAdminProfile} admin - admin value.
   *
   * @returns {AdminData} The admin data result.
   */
  private toAdminData(admin: RedisAdminProfile): AdminData {
    return {
      id: admin.id,
      email: admin.email,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      deletedAt: admin.deletedAt,
    };
  }
}
