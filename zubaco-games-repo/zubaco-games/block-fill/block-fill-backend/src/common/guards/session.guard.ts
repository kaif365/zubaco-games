import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AdminService } from '../../admin/admin.service';
import { RedisService } from '../../redis/redis.service';
import { AUTH_TYPES, REQUEST_CONTEXT, USER_TYPES, type TokenType } from '../constants';
import {
    SESSION_AUTH_MODE,
    SESSION_METADATA_KEY,
    SessionRequirements,
} from '../decorators/session.decorator';
import { verifyToken } from '../utils/token.util';

/**
 * Guard to validate session on HTTP routes using @RequireSession decorator.
 *
 * User flow:  Redis session:{id} + user:{id} lookup (no DB fallback)
 * Admin flow: Redis {projectKey}:session:{id} + {projectKey}:admin:{id},
 *             falls back to admin microservice HTTP call if either misses or Redis is down.
 *
 * AUTH_TYPES.USER_OR_ADMIN (3) in userTypes accepts both user and admin tokens.
 */
@Injectable()
export class SessionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly redis: RedisService,
        private readonly adminService: AdminService,
    ) {}

    /**
     * Validates the session token and loads the authenticated actor into request context.
     * @param {ExecutionContext} context - The Nest execution context.
     * @returns {Promise<boolean>} Whether the request is authorized.
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requirements = this.reflector.get<SessionRequirements>(
            SESSION_METADATA_KEY,
            context.getHandler(),
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

            const allowsUserOrAdmin = requirements.userTypes.includes(AUTH_TYPES.USER_OR_ADMIN);
            const userTypeAllowed =
                allowsUserOrAdmin || requirements.userTypes.includes(payload.userType);

            if (!userTypeAllowed) {
                throw new UnauthorizedException('FORBIDDEN');
            }

            if (requirements.authMode === SESSION_AUTH_MODE.PAYLOAD) {
                request[REQUEST_CONTEXT.USER] = payload;
                return true;
            }

            if (payload.userType === USER_TYPES.ADMIN) {
                const admin = await this.adminService.verifyAdmin(
                    payload.sessionId,
                    payload.userId,
                    token,
                );
                request[REQUEST_CONTEXT.USER] = admin;
            } else {
                const cached = await this.redis.getSession(payload.sessionId);
                if (!cached || new Date(cached.expiresAt) < new Date()) {
                    throw new UnauthorizedException('INVALID_SESSION');
                }

                if (cached.userType !== payload.userType) {
                    throw new UnauthorizedException('TOKEN_INVALID');
                }

                const user = await this.redis.getUser(cached.userId!);
                if (!user) {
                    throw new UnauthorizedException('USER_NOT_FOUND');
                }

                request[REQUEST_CONTEXT.USER] = user;
            }

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('TOKEN_INVALID');
        }
    }

    /**
     * Extracts the bearer token from the authorization header.
     * @param {Request} request - The incoming HTTP request.
     * @returns {string | undefined} The bearer token when present.
     */
    private extractToken(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
