import { RESTATE_SERVICES } from '@common/constants';
import * as restate from '@restatedev/restate-sdk';

import { GAME_SESSION_RESTATE_TARGET } from './game-session.restate';

export interface GameExpiryRequest {
    sessionId: string;
    objectKey: string;
}

interface GameSessionExpiryObjectClient {
    markResultProcessing(request: { sessionId: string }): Promise<void>;
    finalizeExpired(request: { sessionId: string }): Promise<void>;
}

export function createGameExpiryRestateService() {
    return restate.service({
        name: RESTATE_SERVICES.GAME_EXPIRY,
        handlers: {
            markResultProcessing: async (
                ctx: restate.Context,
                request: GameExpiryRequest,
            ): Promise<void> => {
                const gameSessionClient = ctx.objectClient(
                    GAME_SESSION_RESTATE_TARGET,
                    request.objectKey,
                ) as GameSessionExpiryObjectClient;
                await gameSessionClient.markResultProcessing({ sessionId: request.sessionId });
            },
            finalizeExpiredSession: async (
                ctx: restate.Context,
                request: GameExpiryRequest,
            ): Promise<void> => {
                const gameSessionClient = ctx.objectClient(
                    GAME_SESSION_RESTATE_TARGET,
                    request.objectKey,
                ) as GameSessionExpiryObjectClient;
                await gameSessionClient.finalizeExpired({ sessionId: request.sessionId });
            },
        },
    });
}

export type GameExpiryRestateService = ReturnType<typeof createGameExpiryRestateService>;

export const GAME_EXPIRY_RESTATE_TARGET = {
    name: RESTATE_SERVICES.GAME_EXPIRY,
} as GameExpiryRestateService;
