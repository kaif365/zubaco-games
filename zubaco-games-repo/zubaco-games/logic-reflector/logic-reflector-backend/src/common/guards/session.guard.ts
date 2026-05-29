import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { AdminService } from "../../admin/admin.service";
import { UserService } from "../../user/user.service";
import { REQUEST_CONTEXT, USER_TYPES, AUTH_TYPES } from "../constants";
import {
  SESSION_METADATA_KEY,
  SessionRequirements,
} from "../decorators/session.decorator";
import {
  getCachedAdmin,
  getCachedUser,
  setCachedAdmin,
  setCachedUser,
} from "../utils/auth-cache.util";
import { verifyToken } from "../utils/token.util";

/**
 * Guard to validate session on HTTP routes using @RequireSession decorator.
 *
 * User flow:  Redis session:{id} + user:{id} lookup (no DB fallback)
 * Admin flow: Redis {projectKey}:session:{id} + {projectKey}:admin:{id},
 *             falls back to admin microservice HTTP call if either misses or Redis is down.
 *
 * AUTH_TYPES.USER_OR_ADMIN (3) in userTypes accepts both user and admin tokens.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  /**
   * Create a new instance.
   *
   * @param {Reflector} reflector - reflector value.
   * @param {AdminService} adminService - admin service value.
   * @param {UserService} userService - user service value.
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly adminService: AdminService,
    private readonly userService: UserService,
  ) {}

  /**
   * Check whether can activate.
   *
   * @param {ExecutionContext} context - context value.
   *
   * @returns {Promise<boolean>} Whether the condition is met.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirements = this.reflector.get<SessionRequirements>(
      SESSION_METADATA_KEY,
      context.getHandler(),
    );

    if (!requirements) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException("TOKEN_INVALID");
    }

    try {
      const payload = verifyToken(token);

      if (!requirements.tokenTypes.includes(payload.tokenType)) {
        throw new UnauthorizedException("TOKEN_INVALID");
      }

      const allowsUserOrAdmin = requirements.userTypes.includes(
        AUTH_TYPES.USER_OR_ADMIN,
      );
      const userTypeAllowed =
        allowsUserOrAdmin || requirements.userTypes.includes(payload.userType);

      if (!userTypeAllowed) {
        throw new UnauthorizedException("FORBIDDEN");
      }

      if (payload.userType === USER_TYPES.ADMIN) {
        const cached = getCachedAdmin(token);
        if (cached) {
          request[REQUEST_CONTEXT.USER] = cached;
        } else {
          const admin = await this.adminService.verifyAdmin(
            payload.sessionId,
            payload.userId,
            token,
          );
          setCachedAdmin(token, admin, payload.exp);
          request[REQUEST_CONTEXT.USER] = admin;
        }
      } else {
        const cached = getCachedUser(token);
        if (cached) {
          request[REQUEST_CONTEXT.USER] = cached;
        } else {
          const user = await this.userService.verifyUser(
            payload.sessionId,
            payload.userId,
            token,
          );
          setCachedUser(token, user, payload.exp);
          request[REQUEST_CONTEXT.USER] = user;
        }
      }

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
