import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

import { UserHttpService } from './http/user-http.service';
import type { UserData } from './http/user-http.service';

/**
 * Verifies user identity for incoming requests.
 *
 * Flow:
 * 1. Fetch all Redis keys in parallel (session, user, local cache)
 * 2. Cross-check session.userId === userId from JWT payload
 * 3. Both hits → return user data (fast path, Redis TTL handles expiry)
 * 4. Either miss OR Redis down → fall back to GET /user/auth/me
 */
@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private readonly redis: RedisService,
        private readonly userHttp: UserHttpService,
    ) {}

    /**
     * Verify user.
     *
     * @param {string} sessionId - The session id.
     * @param {string} userId - The user id.
     * @param {string} token - The token.
     *
     * @returns {Promise<UserData>} A promise that resolves with the result.
     */
    async verifyUser(sessionId: string, userId: string, token: string): Promise<UserData> {
        try {
            // 1. Fetch all Redis keys in parallel (fast path)
            const [session, user, localCache] = await Promise.all([
                this.redis.getUsersSession(sessionId),
                this.redis.getUsersUser(userId),
                this.redis.getUserAuth(sessionId),
            ]);

            if (session) {
                if (session.userId !== userId) {
                    throw new UnauthorizedException('TOKEN_INVALID');
                }
                if (user) {
                    return user;
                }
            }

            // 2. Check local read-through cache populated by this service
            if (localCache) {
                return localCache;
            }

            this.logger.debug(
                `User Redis cache miss — sessionId=${sessionId}, falling back to HTTP`,
            );
        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }
            this.logger.warn(
                `Redis unreachable during user verification: ${(err as Error).message}`,
            );
        }

        // 3. HTTP fallback — write result into local cache so next request is fast
        const user = await this.userHttp.checkAuthenticated(token);
        void this.redis
            .setUserAuth(sessionId, user)
            .catch((err: Error) =>
                this.logger.warn(
                    `Failed to cache user auth for sessionId=${sessionId}: ${err.message}`,
                ),
            );
        return user;
    }
}
