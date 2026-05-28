import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";

import { RedisService } from "../redis/redis.service";

import { UserHttpService, UserData } from "./http/user-http.service";

/**
 * Verifies user identity for incoming requests.
 *
 * Flow:
 * 1. Fetch {usersProjectKey}:session:{sessionId} from Redis
 * 2. Cross-check session.userId === userId from JWT payload
 * 3. Fetch {usersProjectKey}:user:{userId} from Redis
 * 4. Both hits → return user data (fast path, Redis TTL handles expiry)
 * 5. Either miss OR Redis down → fall back to GET /user/auth/me
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  /**
   * Create a new instance.
   *
   * @param {RedisService} redis - redis value.
   * @param {UserHttpService} userHttp - user http value.
   */
  constructor(
    private readonly redis: RedisService,
    private readonly userHttp: UserHttpService,
  ) {}

  /**
   * Handle verify user.
   *
   * @param {string} sessionId - session id value.
   * @param {string} userId - user id value.
   * @param {string} token - token value.
   *
   * @returns {Promise<UserData>} The asynchronous result.
   */
  async verifyUser(
    sessionId: string,
    userId: string,
    token: string,
  ): Promise<UserData> {
    try {
      const session = await this.redis.getUsersSession(sessionId);

      if (session) {
        if (session.userId !== userId) {
          throw new UnauthorizedException("TOKEN_INVALID");
        }

        const user = await this.redis.getUsersUser(session.userId);
        if (user) {
          return user;
        }
      }

      this.logger.debug(
        `User Redis cache miss — sessionId=${sessionId}, falling back to HTTP`,
      );
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.warn(
        `Redis unreachable during user verification: ${(err as Error).message}`,
      );
    }

    return this.userHttp.checkAuthenticated(token);
  }

  /**
   * Get session.
   *
   * @param {string} sessionId - session id value.
   *
   * @returns {Promise<{ userId: string; userType: number; expiresAt: string; } | null>} The asynchronous result.
   */
  async getSession(sessionId: string) {
    return this.redis.getUsersSession(sessionId);
  }
}
