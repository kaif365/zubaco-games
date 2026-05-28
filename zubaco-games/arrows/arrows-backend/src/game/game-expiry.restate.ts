import { RESTATE_SERVICES } from '@common/constants';
import { wrapRestateHandlers } from '@common/utils/restate-tracing.util';
import * as restate from '@restatedev/restate-sdk';

import { GAME_SESSION_RESTATE_TARGET } from './game-session.restate';

export interface GameExpiryRequest {
    sessionId: string;
    // Passed through so the expiry handler can call the correct Virtual Object key
    // without a DB lookup. Generated at schedule() time from the already-known session.
    objectKey: string; // `${userId}:${stageId}`
}

/**
 * Create the Restate service that schedules and delegates game expiry work.
 *
 * @returns {object} The Restate service definition.
 */
export function createGameExpiryRestateService() {
    return restate.service({
        name: RESTATE_SERVICES.GAME_EXPIRY,
        handlers: wrapRestateHandlers(RESTATE_SERVICES.GAME_EXPIRY, {
            /**
             * Delegate markResultProcessing to the game session Virtual Object so it
             * can update the durable Restate state directly.
             *
             * @param {restate.Context} ctx - Restate handler context.
             * @param {GameExpiryRequest} request - Expiry request payload.
             *
             * @returns {Promise<void>} Resolves when the operation completes.
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
             * Delegate finalizeExpiredSession to the game session Virtual Object so the
             * full game state is committed to the DB from within the object's context.
             *
             * @param {restate.Context} ctx - Restate handler context.
             * @param {GameExpiryRequest} request - Expiry request payload.
             *
             * @returns {Promise<void>} Resolves when the operation completes.
             */
            finalizeExpiredSession: async (
                ctx: restate.Context,
                request: GameExpiryRequest,
            ): Promise<void> => {
                await ctx
                    .objectClient(GAME_SESSION_RESTATE_TARGET, request.objectKey)
                    .finalizeExpired({ sessionId: request.sessionId });
            },
        }),
    });
}

export type GameExpiryRestateService = ReturnType<typeof createGameExpiryRestateService>;

export const GAME_EXPIRY_RESTATE_TARGET = {
    name: RESTATE_SERVICES.GAME_EXPIRY,
} as GameExpiryRestateService;
