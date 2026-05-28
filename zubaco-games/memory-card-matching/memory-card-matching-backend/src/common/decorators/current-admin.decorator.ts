import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { Request } from "express";

export interface CurrentAdminIdentity {
  id: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export const CurrentAdmin = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): CurrentAdminIdentity | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { admin?: CurrentAdminIdentity }>();

    return request.admin;
  },
);
