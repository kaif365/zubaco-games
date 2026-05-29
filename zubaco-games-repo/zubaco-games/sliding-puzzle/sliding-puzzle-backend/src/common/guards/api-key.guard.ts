import { config } from '@common/config/env.config';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const API_KEY_METADATA = 'requireApiKey';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    /**
     * Validates the API key provided in the request headers.
     *
     * @param {ExecutionContext} context The execution context for the current request.
     * @returns {boolean} Returns true when the API key is valid.
     */
    canActivate(context: ExecutionContext): boolean {
        const requireKey = this.reflector.getAllAndOverride<boolean>(API_KEY_METADATA, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requireKey) {
            // Global check: require API key on all routes if config.apiKey is set
            const req = context.switchToHttp().getRequest<Request>();
            const key = req.headers['x-api-key'];
            if (config.apiKey && (!key || key !== config.apiKey)) {
                throw new UnauthorizedException('INVALID_API_KEY');
            }
            return true;
        }

        const req = context.switchToHttp().getRequest<Request>();
        const key = req.headers['x-api-key'];
        if (!key || key !== config.apiKey) {
            throw new UnauthorizedException('INVALID_API_KEY');
        }
        return true;
    }
}
