import { config } from "@config";
import * as jwt from "jsonwebtoken";

import type { TokenType, UserType } from "../constants";

/** Verified token payload used by auth guards after JWT validation. */
export interface TokenPayload {
  sessionId: string;
  userId: string;
  userType: UserType;
  tokenType: TokenType;
}

/**
 * Handle verify token.
 *
 * @param {string} token - token value.
 *
 * @returns {TokenPayload} The verify token result.
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.security.jwtSecret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("TOKEN_EXPIRED");
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("INVALID_TOKEN");
    }

    throw error;
  }
}
