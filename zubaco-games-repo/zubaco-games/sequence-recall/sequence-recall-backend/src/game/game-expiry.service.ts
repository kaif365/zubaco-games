import { GAME_CONFIGS } from '@common/constants';
import { config } from '@config';
import { Injectable, Logger } from '@nestjs/common';
import * as restateClients from '@restatedev/restate-sdk-clients';

import { GAME_EXPIRY_RESTATE_TARGET, GameExpiryRequest } from './game-expiry.restate';

@Injectable()
export class GameExpiryService {
    private readonly logger = new Logger(GameExpiryService.name);
    private readonly restateClient = restateClients.connect({ url: config.restate.ingressUrl });

    /**
     * Schedule two durable expiry callbacks for a game session.
     *
     * 1. At `expiryAtMs`         → markResultProcessing (status flip only)
     * 2. At `expiryAtMs + grace` → finalizeExpired (write to DB, clear state)
     *
     * The `objectKey` (`userId:stageId`) is forwarded so the expiry handlers can
     * call the correct Virtual Object without a DB lookup at fire time.
     * Both sends are idempotent — safe to call multiple times for the same session.
     *
     * @param {string} sessionId - session id value.
     * @param {number} expiryAtMs - expiry at ms value.
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<void>} Resolves when both durable handlers are scheduled.
     */
    async schedule(
        sessionId: string,
        expiryAtMs: number,
        userId: string,
        stageId: string,
    ): Promise<void> {
        const now = Date.now();
        const graceMs = GAME_CONFIGS.EXPIRY_GRACE_SECONDS * 1_000;
        const resultProcessingDelayMs = Math.max(0, expiryAtMs - now);
        const finalizeDelayMs = Math.max(0, expiryAtMs + graceMs - now);
        const payload: GameExpiryRequest = { sessionId, objectKey: `${userId}:${stageId}` };
        const client = this.restateClient.serviceSendClient(GAME_EXPIRY_RESTATE_TARGET);

        await Promise.all([
            client.markResultProcessing(
                payload,
                restateClients.rpc.sendOpts({
                    delay: resultProcessingDelayMs,
                    idempotencyKey: `game-expiry:${sessionId}:result-processing`,
                }),
            ),
            client.finalizeExpired(
                payload,
                restateClients.rpc.sendOpts({
                    delay: finalizeDelayMs,
                    idempotencyKey: `game-expiry:${sessionId}:finalize`,
                }),
            ),
        ]);

        this.logger.debug(`Scheduled durable expiry handlers for session ${sessionId}`);
    }
}
