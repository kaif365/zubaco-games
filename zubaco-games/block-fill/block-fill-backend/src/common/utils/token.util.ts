import { config } from '@config';
import * as jwt from 'jsonwebtoken';

import type { UserType } from '../constants';
import { TOKEN_EXPIRY, TOKEN_TYPES } from '../constants';

export interface TokenPayload {
    sessionId: string;
    userId: string;
    userType: UserType; // numeric: USER_TYPES.USER = 1, USER_TYPES.ADMIN = 2
    tokenType: number;
}

/**
 * Generates a signed JWT for the supplied payload.
 * @param {TokenPayload} payload - The token payload to sign.
 * @param {number} expiresIn - The token lifetime in seconds.
 * @returns {string} The signed JWT.
 */
export function generateToken(payload: TokenPayload, expiresIn: number): string {
    return jwt.sign(payload, config.security.jwtSecret, { expiresIn });
}

/**
 * Verifies and decodes a signed JWT.
 * @param {string} token - The JWT to verify.
 * @returns {TokenPayload} The decoded token payload.
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
 * Generate the single long-lived login token for a user.
 * sessionId is the Redis key for the session cache entry.
 * @param {string} userId - The user identifier.
 * @param {UserType} userType - The user type value.
 * @param {string} sessionId - The login session identifier.
 * @returns {string} The signed login token.
 */
export function generateLoginToken(userId: string, userType: UserType, sessionId: string): string {
    return generateToken(
        { sessionId, userId, userType, tokenType: TOKEN_TYPES.LOGIN },
        TOKEN_EXPIRY.LOGIN,
    );
}

/**
 * Generate a short-lived game session token issued once game:start is called.
 * gameSessionId is the Redis / DB GameSession id.
 * @param {string} userId - The user identifier.
 * @param {UserType} userType - The user type value.
 * @param {string} gameSessionId - The game session identifier.
 * @returns {string} The signed game-session token.
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
