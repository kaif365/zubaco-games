import { randomUUID } from 'crypto';

import { TOKEN_EXPIRY, USER_TYPES } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { generateLoginToken } from '@common/utils/token.util';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

import type { AdminLoginPayload } from './dto/admin-login.dto';
import { verifyPassword } from './password.util';

@Injectable()
export class AdminAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    async login(payload: AdminLoginPayload) {
        const admin = await this.prisma.admin.findFirst({
            where: {
                email: payload.email,
                deleted_at: null,
            },
        });

        if (!admin || !(await verifyPassword(payload.password, admin.password))) {
            throw new UnauthorizedException('INVALID_CREDENTIALS');
        }

        const sessionId = randomUUID();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.LOGIN * 1000);
        const token = generateLoginToken(admin.id, USER_TYPES.ADMIN, sessionId);

        await this.prisma.adminAccessToken.create({
            data: {
                admin_id: admin.id,
                access_token: token,
                session_id: sessionId,
                expires_at: expiresAt,
            },
        });
        try {
            await this.redis.setAdmin(
                admin.id,
                {
                    id: admin.id,
                    email: admin.email,
                    createdAt: admin.created_at.toISOString(),
                    updatedAt: admin.updated_at.toISOString(),
                    deletedAt: admin.deleted_at?.toISOString() ?? null,
                },
                TOKEN_EXPIRY.LOGIN,
            );
            await this.redis.setSession(
                sessionId,
                {
                    adminId: admin.id,
                    userType: USER_TYPES.ADMIN,
                    expiresAt: expiresAt.toISOString(),
                },
                TOKEN_EXPIRY.LOGIN,
            );
        } catch {
            // DB token storage fallback allows requests to continue if Redis is temporarily unavailable.
        }

        return {
            token,
            expiresAt: expiresAt.toISOString(),
            admin: {
                id: admin.id,
                email: admin.email,
                created_at: admin.created_at,
                updated_at: admin.updated_at,
                deleted_at: admin.deleted_at,
            },
        };
    }

    async logout(sessionId: string, adminId: string) {
        await this.prisma.adminAccessToken.deleteMany({
            where: {
                admin_id: adminId,
                session_id: sessionId,
            },
        });

        try {
            await this.redis.deleteSession(sessionId);
        } catch {
            // Token is already invalidated in DB token storage.
        }

        return { message: 'Logged out successfully' };
    }
}
