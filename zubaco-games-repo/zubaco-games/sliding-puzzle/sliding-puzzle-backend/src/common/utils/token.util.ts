import { config } from '@config';
import * as jwt from 'jsonwebtoken';

import type { TokenType, UserType } from '../constants';
import { TOKEN_EXPIRY, TOKEN_TYPES } from '../constants';

/** Fields supplied when signing a token — exp is injected by jwt.sign, not passed in. */
export interface TokenPayload {
    sessionId: string;
    userId: string;
    userType: UserType; // numeric: USER_TYPES.USER = 1, USER_TYPES.ADMIN = 2
    tokenType: TokenType;
}

/** Verified payload returned by verifyToken — includes exp set by jwt.sign. */
export interface VerifiedTokenPayload extends TokenPayload {
    /** Seconds since Unix epoch — set by jwt.sign via the expiresIn option. */
    exp: number;
}

/**
 * Handle generate token.
 *
 * @param {TokenPayload} payload - payload value.
 * @param {number} expiresIn - expires in value.
 *
 * @returns {string} The string result.
 */
export function generateToken(payload: TokenPayload, expiresIn: number): string {
    return jwt.sign(payload, config.security.jwtSecret, { expiresIn });
}

/**
 * Handle verify token.
 *
 * @param {string} token - token value.
 *
 * @returns {TokenPayload} The verify token result.
 */
export function verifyToken(token: string): VerifiedTokenPayload {
    try {
        return jwt.verify(token, config.security.jwtSecret) as VerifiedTokenPayload;
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
 * Handle generate login token.
 *
 * @param {string} userId - user id value.
 * @param {UserType} userType - user type value.
 * @param {string} sessionId - session id value.
 *
 * @returns {string} The string result.
 */
export function generateLoginToken(userId: string, userType: UserType, sessionId: string): string {
    return generateToken(
        { sessionId, userId, userType, tokenType: TOKEN_TYPES.LOGIN },
        TOKEN_EXPIRY.LOGIN,
    );
}

/**
 * Handle generate game session token.
 *
 * @param {string} userId - user id value.
 * @param {UserType} userType - user type value.
 * @param {string} gameSessionId - game session id value.
 *
 * @returns {string} The string result.
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
