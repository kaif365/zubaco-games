import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Socket } from 'socket.io';

function handleAsObservable(next: CallHandler<unknown>): Observable<unknown> {
    return next.handle() as Observable<unknown>;
}

@Injectable()
export class WsLoggerInterceptor implements NestInterceptor {
    private readonly logger = new Logger('WS');

    /**
     * Logs websocket handler execution time and socket metadata.
     * @param {ExecutionContext} context - The Nest execution context.
     * @param {CallHandler<unknown>} next - The next handler in the interceptor chain.
     * @returns {Observable<unknown>} The websocket response stream.
     */
    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        const wsCtx = context.switchToWs();
        const socket = wsCtx.getClient<Socket>();
        const event = context.getHandler().name;
        const userId = (socket.data as { userId?: string })?.userId ?? 'unknown';
        const start = Date.now();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response$ = handleAsObservable(next);

        /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        return response$.pipe(
            tap(() => {
                this.logger.log(
                    `${event} | socket: ${socket.id} | user: ${userId} | ${Date.now() - start}ms`,
                );
            }),
        );
        /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }
}
