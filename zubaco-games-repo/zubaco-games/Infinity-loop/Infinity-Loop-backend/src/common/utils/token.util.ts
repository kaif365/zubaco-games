import { config } from '@config';
import * as jwt from 'jsonwebtoken';

import type { UserType } from '../constants';
import { TOKEN_EXPIRY, TOKEN_TYPES } from '../constants';

export interface TokenPayload {
    sessionId: string;
    userId: string;
    userType: UserType; // numeric: USER_TYPES.USER = 1, USER_TYPES.ADMIN = 2
    tokenType: number;
    exp?: number;
}

export function generateToken(payload: TokenPayload, expiresIn: number): string {
    return jwt.sign(payload, config.security.jwtSecret, { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
    console.log('[token.util] verifyToken called');
    console.log('[token.util] token:', token);
    console.log('[token.util] JWT_SECRET:', config.security.jwtSecret);
    try {
        const payload = jwt.verify(token, config.security.jwtSecret) as TokenPayload;
        console.log('[token.util] token verified successfully, payload:', JSON.stringify(payload));
        return payload;
    } catch (error) {
        console.error('[token.util] token verification FAILED:', error);
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
