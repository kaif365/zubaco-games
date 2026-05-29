import { config } from '@config';
import * as jwt from 'jsonwebtoken';

import type { TokenType, UserType } from '../constants';
import { TOKEN_EXPIRY, TOKEN_TYPES } from '../constants';

export interface TokenPayload {
    sessionId: string;
    userId: string;
    userType: UserType; // numeric: USER_TYPES.USER = 1, USER_TYPES.ADMIN = 2
    tokenType: TokenType;
}

/**
 * Generates token.
 *
 * @param {TokenPayload} payload - Request payload.
 * @param {string} payload.sessionId - The session id.
 * @param {string} payload.userId - The user id.
 * @param {1 | 2} payload.userType - The user type.
 * @param {1 | 2} payload.tokenType - The token type.
 * @param {number} expiresIn - The expires in.
 *
 * @returns {string} The result of generateToken.
 */
export function generateToken(payload: TokenPayload, expiresIn: number): string {
    return jwt.sign(payload, config.security.jwtSecret, { expiresIn });
}

/**
 * Verify token.
 *
 * @param {string} token - The token.
 *
 * @returns {TokenPayload} The result of verifyToken.
 */
export function verifyToken(token: string): TokenPayload {
    try {
        return jwt.verify(token, config.security.jwtSecret) as TokenPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('TOKEN_EXPIRED');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('INVALID_TOKEN');
        }
        throw error;
    }
}

/**
 * Generates login token.
 *
 * @param {string} userId - The user id.
 * @param {1 | 2} userType - The user type.
 * @param {string} sessionId - The session id.
 *
 * @returns {string} The result of generateLoginToken.
 */
export function generateLoginToken(userId: string, userType: UserType, sessionId: string): string {
    return generateToken(
        { sessionId, userId, userType, tokenType: TOKEN_TYPES.LOGIN },
        TOKEN_EXPIRY.LOGIN,
    );
}

/**
 * Generates game session token.
 *
 * @param {string} userId - The user id.
 * @param {1 | 2} userType - The user type.
 * @param {string} gameSessionId - The game session id.
 *
 * @returns {string} The result of generateGameSessionToken.
 */
export function generateGameSessionToken(
    userId: string,
    userType: UserType,
    gameSessionId: string,
): string {
    return generateToken(
        { sessionId: gameSessionId, userId, userType, tokenType: TOKEN_TYPES.GAME_SESSION },
        TOKEN_EXPIRY.GAME_SESSION,
    );
}
