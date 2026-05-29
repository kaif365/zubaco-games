import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { AdminService } from "../../admin/admin.service";
import { TOKEN_TYPES, USER_TYPES } from "../constants";
import type { CurrentAdminIdentity } from "../decorators/current-admin.decorator";
import { verifyToken } from "../utils/token.util";

/**
 * Guard to validate admin bearer tokens on privileged HTTP routes.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  /**
   * Create a new instance.
   *
   * @param {AdminService} adminService - admin service value.
   */
  constructor(private readonly adminService: AdminService) {}

  /**
   * Check whether can activate.
   *
   * @param {ExecutionContext} context - context value.
   *
   * @returns {Promise<boolean>} Whether the condition is met.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { admin?: CurrentAdminIdentity }>();
    const authorization = request.headers.authorization;
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      throw new UnauthorizedException({
        error: "ADMIN_TOKEN_REQUIRED",
        message: "Authorization bearer token is required",
      });
    }

    try {
      const payload = verifyToken(token);

      if (payload.tokenType !== TOKEN_TYPES.LOGIN) {
        throw new UnauthorizedException("TOKEN_INVALID");
      }

      if (payload.userType !== USER_TYPES.ADMIN) {
        throw new UnauthorizedException("FORBIDDEN");
      }

      request.admin = await this.adminService.verifyAdmin(
        payload.sessionId,
        payload.userId,
        token,
      );

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("TOKEN_INVALID");
    }
  }
}
