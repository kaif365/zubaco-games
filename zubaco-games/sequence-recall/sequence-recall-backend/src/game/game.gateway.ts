import { randomUUID } from 'crypto';

import { MOVE_STATUS } from '@common/constants';
import { WsExceptionFilter } from '@common/filters/ws-exception.filter';
import { wsSuccess } from '@common/utils/ws-response.util';
import { Logger, UseFilters } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { GameSessionRestateService } from './game-session-restate.service';

// Restate handles all durability and expiry — no in-process timers needed.

interface SocketData {
    userId: string;
    userName: string;
    sessionId: string;
    stageId: string | null;
}

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
    namespace: 'realtime',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket'],
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(GameGateway.name);

    constructor(private readonly gameSessionRestate: GameSessionRestateService) {}

    /**
     * After init.
     *
     * @param {Server} server - The server.
     *
     * @returns {void}
     */
    afterInit(server: Server) {
        server.use((socket: Socket, next) => {
            try {
                // Mocking user — in production these come from JWT verification
                (socket.data as SocketData) = {
                    userId: randomUUID(),
                    userName: 'Mock User',
                    sessionId: randomUUID(),
                    stageId: null,
                };
                next();
            } catch {
                next(new Error('AUTH_FAILED'));
            }
        });

        this.logger.log('GameGateway initialized on namespace /realtime');
    }

    /**
     * Handles connection.
     *
     * @param {Socket} socket - The socket.
     *
     * @returns {void}
     */
    handleConnection(socket: Socket) {
        const data = socket.data as SocketData;
        this.logger.log(`Connected: ${socket.id} | user: ${data?.userId}`);
    }

    /**
     * Handles disconnect.
     *
     * @param {Socket} socket - The socket.
     *
     * @returns {void}
     */
    handleDisconnect(socket: Socket) {
        const data = socket.data as SocketData;
        this.logger.log(`Disconnected: ${socket.id} | user: ${data?.userId}`);
    }

    /**
     * Handles game start.
     * Routes through Restate — serialized with all other handlers for this userId:stageId key.
     *
     * @param {Socket} socket - The socket.
     * @param {{ stageId: string }} payload - Request payload.
     *
     * @returns {Promise<object>}
     */
    @SubscribeMessage('game:start')
    async handleGameStart(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: { stageId: string },
    ) {
        const data = socket.data as SocketData;
        const stageId = payload.stageId;
        if (!stageId) {
            throw new WsException('STAGE_ID_REQUIRED');
        }

        const roomName = `user:${data.userId}:stage:${stageId}`;

        // Enforce single socket per user/stage
        const existingSockets = await this.server.in(roomName).fetchSockets();
        for (const existing of existingSockets) {
            if (existing.id !== socket.id) {
                existing.emit('force:disconnect', wsSuccess(null, 'NEW_CONNECTION'));
                existing.disconnect(true);
            }
        }

        const result = await this.gameSessionRestate
            .startGame(data.userId, stageId)
            .catch((err: unknown) => {
                throw new WsException(err instanceof Error ? err.message : 'SESSION_START_FAILED');
            });

        data.stageId = stageId;
        void socket.join(roomName);

        // Emit new_round with current sequence immediately (Restate is already durable)
        setImmediate(() => {
            socket.emit(
                'game:new_round',
                wsSuccess(
                    {
                        round: result.currentRound,
                        sequence: result.sequence,
                        timeDelay: result.flashDelay,
                        levelDelay: result.levelDelay,
                        ...(result.endTime && { endTime: result.endTime }),
                    },
                    'NEW_ROUND_START',
                ),
            );
        });

        return wsSuccess(
            {
                sessionId: result.sessionId,
                endTime: result.endTime ?? null,
                isResumed: result.isResumed,
            },
            'GAME_STARTED',
        );
    }

    /**
     * Handles a single tile click.
     * Routes through Restate — concurrent moves are serialized, not raced.
     *
     * @param {Socket} socket - The socket.
     * @param {{ tileId: number }} payload - Request payload.
     *
     * @returns {Promise<object>}
     */
    @SubscribeMessage('game:move')
    async handleGameMove(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: { tileId: number },
    ) {
        const data = socket.data as SocketData;
        if (!data.stageId) {
            throw new WsException('NO_ACTIVE_GAME_SESSION');
        }

        const stageId = data.stageId;
        const room = `user:${data.userId}:stage:${stageId}`;

        const result = await this.gameSessionRestate
            .validateMove(data.userId, stageId, payload.tileId)
            .catch((err: unknown) => {
                throw new WsException(err instanceof Error ? err.message : 'MOVE_FAILED');
            });

        if (
            result.status === MOVE_STATUS.ROUND_SUCCESS ||
            result.status === MOVE_STATUS.WRONG_MOVE
        ) {
            const {
                sequence,
                nextRound,
                flashDelay: roundFlashDelay,
                levelDelay: roundLevelDelay,
                endTime: newEndTime,
            } = result as {
                sequence: number[];
                nextRound: number;
                flashDelay?: number;
                levelDelay?: number;
                endTime?: Date;
            };

            setImmediate(() => {
                this.server.to(room).emit(
                    'game:new_round',
                    wsSuccess(
                        {
                            round: nextRound,
                            sequence,
                            ...(roundFlashDelay !== undefined && { timeDelay: roundFlashDelay }),
                            ...(roundLevelDelay !== undefined && { levelDelay: roundLevelDelay }),
                            ...(newEndTime && {
                                endTime:
                                    newEndTime instanceof Date
                                        ? newEndTime.toISOString()
                                        : newEndTime,
                            }),
                        },
                        'NEW_ROUND_START',
                    ),
                );
            });
        } else if (result.status === MOVE_STATUS.GAME_COMPLETE) {
            const { finalScore, bonus, completedRounds } = result as {
                finalScore: number;
                bonus: number;
                completedRounds: number;
            };

            setImmediate(() => {
                this.server
                    .to(room)
                    .emit(
                        'game:game_over',
                        wsSuccess(
                            { reason: 'COMPLETED', finalScore, completedRounds, bonus },
                            'GAME_OVER',
                        ),
                    );
            });
            data.stageId = null;
        } else if (result.status === MOVE_STATUS.TIME_UP) {
            // Expiry was already committed by Restate — just notify the client
            setImmediate(() => {
                this.server
                    .to(room)
                    .emit(
                        'game:game_over',
                        wsSuccess(
                            { reason: 'TIME_UP', finalScore: 0, completedRounds: 0, bonus: 0 },
                            'GAME_OVER',
                        ),
                    );
            });
            data.stageId = null;
        }

        // Strip internal-only fields before returning acknowledgement
        const {
            sequence: _seq,
            nextRound: _nr,
            completedRounds: _cr,
            finalScore: _fs,
            bonus: _b,
            endTime: _et,
            flashDelay: _fd,
            levelDelay: _ld,
            ...clientResult
        } = result as Record<string, unknown>;
        void _seq;
        void _nr;
        void _cr;
        void _fs;
        void _b;
        void _et;
        void _fd;
        void _ld;
        return wsSuccess(clientResult, 'MOVE_PROCESSED');
    }

    /**
     * Handles client-initiated game completion.
     * Routes through Restate for atomic finalization.
     *
     * @param {Socket} socket - The socket.
     *
     * @returns {Promise<object>}
     */
    @SubscribeMessage('game:complete')
    async handleGameComplete(@ConnectedSocket() socket: Socket) {
        const data = socket.data as SocketData;
        if (!data.stageId) {
            throw new WsException('NO_ACTIVE_GAME_SESSION');
        }

        const result = await this.gameSessionRestate
            .endGame(data.userId, data.stageId, 'COMPLETED')
            .catch((err: unknown) => {
                throw new WsException(err instanceof Error ? err.message : 'GAME_COMPLETE_FAILED');
            });

        data.stageId = null;
        return wsSuccess(
            { score: result.finalScore, completedRounds: result.completedRounds },
            'GAME_COMPLETED',
        );
    }
}
