import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import { REQUEST_CONTEXT } from '../constants';
import type { RequestWithContext } from '../interfaces/request-context.interface';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithContext>();
    return request[REQUEST_CONTEXT.USER];
});
