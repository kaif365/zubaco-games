import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

import { AdminHttpService, AdminData } from './http/admin-http.service';

/**
 * Verifies admin identity for incoming requests.
 *
 * Flow:
 * 1. Fetch {adminProjectKey}:session:{sessionId} from Redis
 * 2. Cross-check session.adminId === adminId from JWT payload
 * 3. Fetch {adminProjectKey}:admin:{adminId} from Redis
 * 4. Both hits → return admin data (fast path, Redis TTL handles expiry)
 * 5. Either miss OR Redis down → fall back to GET /admin/auth/me
 */
@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly redis: RedisService,
        private readonly adminHttp: AdminHttpService,
    ) {}

    async verifyAdmin(sessionId: string, adminId: string, token: string): Promise<AdminData> {
        try {
            const session = await this.redis.getProjectSession(sessionId);

            if (session) {
                if (session.adminId !== adminId) {
                    throw new UnauthorizedException('TOKEN_INVALID');
                }

                const admin = await this.redis.getProjectAdmin(session.adminId);
                if (admin) {
                    return admin;
                }
            }

            this.logger.debug(
                `Admin Redis cache miss — sessionId=${sessionId}, falling back to HTTP`,
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
