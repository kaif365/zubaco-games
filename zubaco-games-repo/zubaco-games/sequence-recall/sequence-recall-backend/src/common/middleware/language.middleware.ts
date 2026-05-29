import { config } from '@config';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { REQUEST_CONTEXT, HEADERS } from '../constants';
import type { RequestWithContext } from '../interfaces/request-context.interface';

@Injectable()
export class LanguageMiddleware implements NestMiddleware {
    /**
     * Hook for .
     *
     * @param {RequestWithContext<unknown>} request - Request data.
     * @param {Response<any, Record<string, any>>} _response - The response.
     * @param {NextFunction} next - The next.
     *
     * @returns {void} No return value.
     */
    use(request: RequestWithContext, _response: Response, next: NextFunction): void {
        const lang = request.headers[HEADERS.ACCEPT_LANGUAGE];
        const resolved = config.language.supported.includes(lang as string)
            ? lang
            : config.language.default;
        request[REQUEST_CONTEXT.LANGUAGE] = resolved;
        next();
    }
}
