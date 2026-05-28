import { RESTATE_SERVICES } from '@common/constants';
import * as restate from '@restatedev/restate-sdk';

import { GAME_SESSION_RESTATE_TARGET } from './game-session.restate';

export interface GameExpiryRequest {
    sessionId: string;
    objectKey: string; // `${userId}:${stageId}` — routes to the correct Virtual Object instance
}

export function createGameExpiryRestateService() {
    return restate.service({
        name: RESTATE_SERVICES.GAME_EXPIRY,
        handlers: {
            /**
             * Delegate markResultProcessing into the correct Virtual Object so it
             * can update the durable Restate state directly.
             */
            markResultProcessing: async (
                ctx: restate.Context,
                request: GameExpiryRequest,
            ): Promise<void> => {
                await ctx
                    .objectClient(GAME_SESSION_RESTATE_TARGET, request.objectKey)
                    .markResultProcessing({ sessionId: request.sessionId });
            },

            /**
             * Delegate finalizeExpired into the correct Virtual Object so the
             * full game state is committed to the DB from within the object's context.
             */
            finalizeExpired: async (
                ctx: restate.Context,
                request: GameExpiryRequest,
            ): Promise<void> => {
                await ctx
                    .objectClient(GAME_SESSION_RESTATE_TARGET, request.objectKey)
                    .finalizeExpired({ sessionId: request.sessionId });
            },
        },
    });
}

export type GameExpiryRestateService = ReturnType<typeof createGameExpiryRestateService>;

export const GAME_EXPIRY_RESTATE_TARGET = {
    name: RESTATE_SERVICES.GAME_EXPIRY,
} as GameExpiryRestateService;
