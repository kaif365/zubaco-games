import { config } from "@config";
import * as jwt from "jsonwebtoken";

import type { TokenType, UserType } from "../constants";
import { TOKEN_EXPIRY, TOKEN_TYPES } from "../constants";

export interface TokenPayload {
  sessionId: string;
  userId: string;
  userType: UserType;
  tokenType: TokenType;
}

/**
 * Handle generate token.
 *
 * @param {TokenPayload} payload - payload value.
 * @param {number} expiresIn - expires in value.
 *
 * @returns {string} The string result.
 */
export function generateToken(
  payload: TokenPayload,
  expiresIn: number,
): string {
  return jwt.sign(payload, config.security.jwtSecret, { expiresIn });
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

/**
 * Handle generate login token.
 *
 * @param {string} userId - user id value.
 * @param {UserType} userType - user type value.
 * @param {string} sessionId - session id value.
 *
 * @returns {string} The string result.
 */
export function generateLoginToken(
  userId: string,
  userType: UserType,
  sessionId: string,
): string {
  return generateToken(
    { sessionId, userId, userType, tokenType: TOKEN_TYPES.LOGIN },
    TOKEN_EXPIRY.LOGIN,
  );
}
