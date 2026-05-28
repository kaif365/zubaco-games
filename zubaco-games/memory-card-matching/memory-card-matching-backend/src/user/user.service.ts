import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";

import { USER_TYPES } from "../common/constants";
import { RedisService } from "../redis/redis.service";

import { UserData, UserHttpService } from "./http/user-http.service";

export type AuthenticatedGameUser = UserData;

/**
 * Verifies player identity for gameplay requests.
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
   * @returns {Promise<AuthenticatedGameUser>} The asynchronous result.
   */
  async verifyUser(
    sessionId: string,
    userId: string,
    token: string,
  ): Promise<AuthenticatedGameUser> {
    try {
      const session = await this.redis.getUsersSession(sessionId);

      if (session) {
        if (session.userId !== userId) {
          throw new UnauthorizedException("TOKEN_INVALID");
        }

        if (session.userType !== USER_TYPES.USER) {
          throw new UnauthorizedException("FORBIDDEN");
        }

        if (new Date(session.expiresAt) < new Date()) {
          throw new UnauthorizedException("INVALID_SESSION");
        }

        const user = await this.redis.getUsersUser(userId);

        if (user?.stageId) {
          return {
            userId: user.id,
            stageId: user.stageId,
            userType: session.userType,
            sessionId,
            name: user.name,
            createdAt: user.createdAt,
          };
        }
      }

      this.logger.debug(
        `User Redis cache miss - sessionId=${sessionId}, falling back to HTTP`,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn(
        `Redis unreachable during user verification: ${(error as Error).message}`,
      );
    }

    const fallbackUser = await this.userHttp.checkAuthenticated(token);

    return {
      ...fallbackUser,
      sessionId,
    };
  }
}
