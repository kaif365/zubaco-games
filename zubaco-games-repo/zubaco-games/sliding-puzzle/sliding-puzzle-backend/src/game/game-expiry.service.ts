import { GAME_SESSION_STATUS, GAME_CONFIGS } from '@common/constants';
import { config } from '@config';
import { Injectable, Logger } from '@nestjs/common';
import * as restateClients from '@restatedev/restate-sdk-clients';

import { GAME_EXPIRY_RESTATE_TARGET, GameExpiryRequest } from './game-expiry.restate';

@Injectable()
export class GameExpiryService {
    private readonly logger = new Logger(GameExpiryService.name);
    private readonly restateClient = restateClients.connect({ url: config.restate.ingressUrl });

    /**
     * Schedule durable expiry handlers for a game session.
     * objectKey (`userId:stageId`) is forwarded so the expiry Restate service can
     * call the correct Virtual Object without a DB lookup at fire time.
     *
     * @param {string} sessionId - session id value.
     * @param {number} expiryAtMs - expiry at ms value.
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     * @param {number} currentStatus - current status value.
     *
     * @returns {Promise<void>} Resolves when durable expiry handlers are scheduled.
     */
    async schedule(
        sessionId: string,
        expiryAtMs: number,
        userId: string,
        stageId: string,
        currentStatus: number = GAME_SESSION_STATUS.STARTED,
    ): Promise<void> {
        const now = Date.now();
        const graceMs = GAME_CONFIGS.SUBMIT_MOVES_EXPIRY_GRACE_SECONDS * 1000;
        const resultProcessingDelayMs = Math.max(0, expiryAtMs - now);
        const finalizeDelayMs = Math.max(0, expiryAtMs + graceMs - now);
        // objectKey lets the expiry handler call the correct Virtual Object without a DB lookup
        const payload: GameExpiryRequest = { sessionId, objectKey: `${userId}:${stageId}` };
        const client = this.restateClient.serviceSendClient(GAME_EXPIRY_RESTATE_TARGET);

        if (currentStatus === GAME_SESSION_STATUS.STARTED) {
            await client.markResultProcessing(
                payload,
                restateClients.rpc.sendOpts({
                    delay: resultProcessingDelayMs,
                    idempotencyKey: `game-expiry:${sessionId}:result-processing`,
                }),
            );
        }

        await client.finalizeExpiredSession(
            payload,
            restateClients.rpc.sendOpts({
                delay: finalizeDelayMs,
                idempotencyKey: `game-expiry:${sessionId}:finalize`,
            }),
        );

        this.logger.debug(`Scheduled durable expiry handlers for session ${sessionId}`);
    }
}
