import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private logger = new Logger('HTTP');

    /**
     * Handle the middleware request.
     *
     * @param {Request} request - request value.
     * @param {Response} response - response value.
     * @param {NextFunction} next - next value.
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
