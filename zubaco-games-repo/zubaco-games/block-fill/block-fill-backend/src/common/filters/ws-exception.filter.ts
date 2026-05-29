import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

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
     * Transforms a websocket exception into a standardized socket error event.
     * @param {WsException} exception - The websocket exception that was thrown.
     * @param {ArgumentsHost} host - The Nest arguments host.
     * @returns {void} Nothing.
     */
    catch(exception: WsException, host: ArgumentsHost): void {
        const ctx = host.switchToWs();
        const client = ctx.getClient<Socket>();

        const message =
            typeof exception.getError() === 'string'
                ? (exception.getError() as string)
                : 'INTERNAL_SERVER_ERROR';

        const response = wsError(message, STATUS_CODES.BAD_REQUEST);

        this.logger.warn(`WsException: ${message}`);

        // Emit to the client directly — received by socket.on('exception', ...)
        client.emit('exception', response);
    }
}
