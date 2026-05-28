import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private logger = new Logger('HTTP');

    /**
     * Hook for .
     *
     * @param {Request<ParamsDictionary, any, any, QueryString.ParsedQs, Record<string, any>>} request - Request data.
     * @param {Response<any, Record<string, any>>} response - The response.
     * @param {NextFunction} next - The next.
     *
     * @returns {void} No return value.
     */
    use(request: Request, response: Response, next: NextFunction): void {
        const { ip, method, originalUrl } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();

        response.on('finish', () => {
            const { statusCode } = response;
            const contentLength = response.get('content-length') || '-';
            const turnaroundTime = Date.now() - startTime;

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${turnaroundTime}ms`,
            );
        });

        next();
    }
}
