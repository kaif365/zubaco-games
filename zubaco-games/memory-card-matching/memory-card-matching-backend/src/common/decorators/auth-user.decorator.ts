import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { Request } from "express";

interface AuthenticatedRequest extends Request {
  user?: Record<string, unknown>;
}

export const AuthUser = createParamDecorator(
  (property: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;

    if (!property) {
      return user;
    }

    return user?.[property];
  },
);
