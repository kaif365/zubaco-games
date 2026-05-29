import { TOKEN_TYPES, USER_TYPES } from "@common/constants";
import { verifyToken } from "@common/utils/token.util";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { UserService } from "../../user/user.service";

interface GameSessionRequest extends Request {
  user?: {
    userId: string;
    stageId: string;
    userType: number;
    sessionId: string;
  };
}

/**
 * Guard to validate player bearer tokens on gameplay routes.
 */
@Injectable()
export class GameSessionGuard implements CanActivate {
  /**
   * Create a new instance.
   *
   * @param {UserService} userService - user service value.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Check whether can activate.
   *
   * @param {ExecutionContext} context - context value.
   *
   * @returns {Promise<boolean>} Whether the condition is met.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GameSessionRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("TOKEN_INVALID");
    }

    try {
      const payload = verifyToken(token);

      if (payload.tokenType !== TOKEN_TYPES.LOGIN) {
        throw new UnauthorizedException("TOKEN_INVALID");
      }

      if (payload.userType !== USER_TYPES.USER) {
        throw new UnauthorizedException("FORBIDDEN");
      }

      const user = await this.userService.verifyUser(
        payload.sessionId,
        payload.userId,
        token,
      );

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("TOKEN_INVALID");
    }
  }

  /**
   * Extract token.
   *
   * @param {Request} request - request value.
   *
   * @returns {string | undefined} The extract token result.
   */
  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
