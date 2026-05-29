import { USER_TYPES } from "@common/constants";
import { config } from "@config";
import { Injectable, UnauthorizedException } from "@nestjs/common";

export interface UserData {
  userId: string;
  name?: string;
  createdAt?: string;
  stageId: string;
  userType: number;
  sessionId: string;
}

/**
 * Fetches authenticated player details from the users microservice.
 */
@Injectable()
export class UserHttpService {
  /**
   * Handle check authenticated.
   *
   * @param {string} token - token value.
   *
   * @returns {Promise<UserData>} The asynchronous result.
   */
  async checkAuthenticated(token: string): Promise<UserData> {
    try {
      const response = await fetch(
        new URL("/user/auth/me", config.usersMicroservice.baseUrl),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException("USER_VERIFICATION_FAILED");
      }

      const body = (await response.json()) as {
        data?: {
          id: string;
          name?: string;
          createdAt?: string;
          stageId: string;
        };
      };

      const user = body.data;

      if (!user?.id || !user.stageId) {
        throw new UnauthorizedException("USER_VERIFICATION_FAILED");
      }

      return {
        userId: user.id,
        stageId: user.stageId,
        userType: USER_TYPES.USER,
        sessionId: "",
        name: user.name,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("USER_VERIFICATION_FAILED");
    }
  }
}
