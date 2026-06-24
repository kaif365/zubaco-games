import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { RedisService } from '../../redis/redis.service';
import { REQUEST_CONTEXT, USER_TYPES } from '../constants';
import type { TokenType } from '../constants';
import {
    PUBLIC_ROUTE_KEY,
    SESSION_METADATA_KEY,
    SessionRequirements,
} from '../decorators/session.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { verifyToken } from '../utils/token.util';

/**
 * Guard to validate session on HTTP routes using @RequireSession decorator.
 * Redis remains the fast path; admin_access_tokens is the fallback when Redis misses or is unavailable.
 */
@Injectable()
export class SessionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private redis: RedisService,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const requirements = this.reflector.getAllAndOverride<SessionRequirements>(
            SESSION_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requirements) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractToken(request);
        if (!token) {
            throw new UnauthorizedException('TOKEN_INVALID');
        }

        try {
            const payload = verifyToken(token);

            if (!requirements.tokenTypes.includes(payload.tokenType as TokenType)) {
                throw new UnauthorizedException('TOKEN_INVALID');
            }

            if (!requirements.userTypes.includes(payload.userType)) {
                throw new UnauthorizedException('FORBIDDEN');
            }

            request[REQUEST_CONTEXT.SESSION] = {
                sessionId: payload.sessionId,
                userId: payload.userId,
                userType: payload.userType,
                tokenType: payload.tokenType,
            };

            if (payload.userType === USER_TYPES.ADMIN) {
                const admin = await this.getAdminFromRedis(payload, token);

                if (!admin) {
                    throw new UnauthorizedException('ADMIN_NOT_FOUND');
                }

                request[REQUEST_CONTEXT.ADMIN] = admin;
                return true;
            }

            throw new UnauthorizedException('FORBIDDEN');
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('TOKEN_INVALID');
        }
    }

    private async getAdminFromRedis(payload: ReturnType<typeof verifyToken>, token: string) {
        try {
            const cached = await this.redis.getSession(payload.sessionId);
            if (!cached || new Date(cached.expiresAt) < new Date()) {
                return this.getAdminFromDatabase(payload.userId, token);
            }

            if (cached.userType !== payload.userType) {
                throw new UnauthorizedException('TOKEN_INVALID');
            }

            if (cached.adminId !== payload.userId) {
                throw new UnauthorizedException('TOKEN_INVALID');
            }

            const admin = await this.redis.getAdmin(cached.adminId);
            if (admin) {
                const activeAdmin = await this.prisma.admin.findFirst({
                    where: {
                        id: cached.adminId,
                        deleted_at: null,
                    },
                    select: {
                        id: true,
                        email: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                    },
                });

                if (!activeAdmin) {
                    await Promise.allSettled([
                        this.redis.deleteAdmin(cached.adminId),
                        this.redis.deleteSession(payload.sessionId),
                    ]);
                    return null;
                }

                return {
                    ...activeAdmin,
                    created_at: activeAdmin.created_at.toISOString(),
                    updated_at: activeAdmin.updated_at.toISOString(),
                    deleted_at: null,
                };
            }
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
        }

        return this.getAdminFromDatabase(payload.userId, token);
    }

    private async getAdminFromDatabase(adminId: string, token: string) {
        const adminToken = await this.prisma.adminAccessToken.findFirst({
            where: {
                access_token: token,
                admin_id: adminId,
                expires_at: {
                    gt: new Date(),
                },
            },
            select: {
                admin: {
                    select: {
                        id: true,
                        email: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                    },
                },
            },
        });

        const admin = adminToken?.admin;
        if (!admin) {
            return null;
        }
        if (admin.deleted_at) {
            return null;
        }

        return {
            ...admin,
            created_at: admin.created_at.toISOString(),
            updated_at: admin.updated_at.toISOString(),
            deleted_at: null,
        };
    }

    private extractToken(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
