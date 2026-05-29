import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { STATUS_CODES } from '../constants';
import { wsError } from '../utils/ws-response.util';

/**
 * Global WebSocket exception filter.
 * Catches WsExceptions thrown in gateway handlers and emits them back
 * as a standardised ApiResponse-shaped object via the socket 'exception' event.
 *
 * Clients should listen to the 'exception' event to handle errors uniformly:
 *   socket.on('exception', (response) => { ... })
 *
 * For ACK-based handlers the formatted response is also passed to the callback.
 */
@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
    private readonly logger = new Logger(WsExceptionFilter.name);

    /**
     * Catch.
     *
     * @param {WsException} exception - The exception.
     * @param {ArgumentsHost} host - The host.
     *
     * @returns {void} No return value.
     */
    catch(exception: WsException, host: ArgumentsHost) {
        const ctx = host.switchToWs();
        const client = ctx.getClient<Socket>();
        const error = exception.getError();

        const message = typeof error === 'string' ? error : 'INTERNAL_SERVER_ERROR';

        const response = wsError(message, STATUS_CODES.BAD_REQUEST);

        this.logger.warn(`WsException: ${message}`);

        // Emit to the client directly — received by socket.on('exception', ...)
        client.emit('exception', response);
    }
}
