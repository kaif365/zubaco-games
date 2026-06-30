import { wsSuccess } from '@common/utils/ws-response.util';
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Block Fill is an HTTP-first game: authoritative game-session start and
 * completion are handled by the REST `GameController`, not over WebSockets.
 *
 * This gateway exists only to give realtime clients an explicit, well-defined
 * response telling them to use the HTTP endpoints instead of silently dropping
 * the message. It intentionally holds no game state and performs no mutations.
 */
@WebSocketGateway({
    namespace: 'realtime',
    cors: {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket'],
})
export class GameGateway {
    /** Realtime clients are redirected to `POST` the HTTP game-session start endpoint. */
    @SubscribeMessage('block-fill:start')
    handleStart(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
        void socket;
        void payload;
        return wsSuccess(null, 'USE_HTTP_GAME_SESSION_START');
    }

    /** Realtime clients are redirected to `POST` the HTTP game-session complete endpoint. */
    @SubscribeMessage('block-fill:submit')
    handleSubmit(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
        void socket;
        void payload;
        return wsSuccess(null, 'USE_HTTP_GAME_SESSION_COMPLETE');
    }
}
