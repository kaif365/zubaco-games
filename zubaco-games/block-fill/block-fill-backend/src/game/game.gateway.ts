import { wsSuccess } from '@common/utils/ws-response.util';
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

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
    @SubscribeMessage('block-fill:start')
    handleStart(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
        void socket;
        void payload;
        return wsSuccess(null, 'USE_HTTP_GAME_SESSION_START');
    }

    @SubscribeMessage('block-fill:submit')
    handleSubmit(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
        void socket;
        void payload;
        return wsSuccess(null, 'USE_HTTP_GAME_SESSION_COMPLETE');
    }
}
