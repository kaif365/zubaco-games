import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

import { AdminHttpService, AdminData } from './http/admin-http.service';

/**
 * Verifies admin identity for incoming requests.
 *
 * Flow:
 * 1. Fetch session and admin data from Redis in parallel
 * 2. Cross-check session.adminId === adminId from JWT payload
 * 3. Both hits -> return admin data (fast path, Redis TTL handles expiry)
 * 4. Either miss OR Redis down -> fall back to GET /admin/auth/me
 */
@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly redis: RedisService,
        private readonly adminHttp: AdminHttpService,
    ) {}

    /**
     * Verify admin.
     *
     * @param {string} sessionId - The session id.
     * @param {string} adminId - The admin id.
     * @param {string} token - The token.
     *
     * @returns {Promise<AdminData>} A promise that resolves with the result.
     */
    async verifyAdmin(sessionId: string, adminId: string, token: string): Promise<AdminData> {
        try {
            // Fetch session and admin data in parallel
            const [session, admin] = await Promise.all([
                this.redis.getProjectSession(sessionId),
                this.redis.getProjectAdmin(adminId),
            ]);

            if (session) {
                if (session.adminId !== adminId) {
                    throw new UnauthorizedException('TOKEN_INVALID');
                }
                if (admin) {
                    return admin;
                }
            }

            this.logger.debug(
                `Admin Redis cache miss - sessionId=${sessionId}, falling back to HTTP`,
            );
        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }
            this.logger.warn(
                `Redis unreachable during admin verification: ${(err as Error).message}`,
            );
        }

        return this.adminHttp.checkAuthenticated(token);
    }
}
