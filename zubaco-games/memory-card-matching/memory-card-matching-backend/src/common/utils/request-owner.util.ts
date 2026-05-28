import { UnauthorizedException } from "@nestjs/common";

export interface RequestIdentity {
  ownerKey: string;
  authType: "bearer";
}

/**
 * Resolve a stable request owner key from the Authorization header.
 *
 * @param {string | undefined} authorization - authorization header value.
 *
 * @returns {RequestIdentity} The request identity result.
 */
export function resolveRequestIdentity(
  authorization?: string,
): RequestIdentity {
  const bearerToken = authorization?.replace(/^Bearer\s+/i, "").trim();

  if (bearerToken) {
    return {
      ownerKey: `bearer:${bearerToken}`,
      authType: "bearer",
    };
  }

  throw new UnauthorizedException("Authorization bearer token is required");
}
