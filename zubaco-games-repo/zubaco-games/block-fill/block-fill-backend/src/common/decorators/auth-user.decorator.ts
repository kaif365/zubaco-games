import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import { REQUEST_CONTEXT } from '../constants';

export const AuthUser = createParamDecorator(
    (property: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const user = request[REQUEST_CONTEXT.USER as keyof Request] as
            | Record<string, unknown>
            | undefined;

        if (!property) {
            return user;
        }

        return user?.[property];
    },
);
