import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Socket } from 'socket.io';

@Injectable()
export class WsLoggerInterceptor implements NestInterceptor {
    private readonly logger = new Logger('WS');

    /**
     * Intercept the request lifecycle.
     *
     * @param {ExecutionContext} context - context value.
     * @param {CallHandler} next - next value.
     *
     * @returns {Observable<unknown>} The response stream.
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const wsCtx = context.switchToWs();
        const socket = wsCtx.getClient<Socket>();
        const event = context.getHandler().name;
        const userId = (socket.data as { userId?: string })?.userId ?? 'unknown';
        const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                this.logger.log(
                    `${event} | socket: ${socket.id} | user: ${userId} | ${Date.now() - start}ms`,
                );
            }),
        );
    }
}
