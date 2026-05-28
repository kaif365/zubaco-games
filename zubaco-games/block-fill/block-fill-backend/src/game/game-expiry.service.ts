import { GAME_SESSION_STATUS } from '@common/constants';
import { config } from '@config';
import { Injectable, Logger } from '@nestjs/common';
import * as restateClients from '@restatedev/restate-sdk-clients';

import { GAME_EXPIRY_RESTATE_TARGET, GameExpiryRequest } from './game-expiry.restate';

const SUBMIT_EXPIRY_GRACE_SECONDS = 5;

interface GameExpiryServiceSendClient {
    markResultProcessing(
        payload: GameExpiryRequest,
        options: ReturnType<typeof restateClients.rpc.sendOpts>,
    ): Promise<void>;
    finalizeExpiredSession(
        payload: GameExpiryRequest,
        options: ReturnType<typeof restateClients.rpc.sendOpts>,
    ): Promise<void>;
}

interface RestateServiceClient {
    serviceSendClient(target: typeof GAME_EXPIRY_RESTATE_TARGET): GameExpiryServiceSendClient;
}

function createRestateClient(): RestateServiceClient {
    // Restate client types are currently too loose for eslint's unsafe-* rules.

    const client = restateClients.connect({
        url: config.restate.ingressUrl,
    }) as unknown as RestateServiceClient;
    return client;
}

@Injectable()
export class GameExpiryService {
    private readonly logger = new Logger(GameExpiryService.name);
    private readonly restateClient = createRestateClient();

    async schedule(
        sessionId: string,
        expiryAtMs: number,
        userId: string,
        stageId: string,
        currentStatus: number = GAME_SESSION_STATUS.ACTIVE,
    ): Promise<void> {
        const now = Date.now();
        const graceMs = SUBMIT_EXPIRY_GRACE_SECONDS * 1000;
        const resultProcessingDelayMs = Math.max(0, expiryAtMs - now);
        const finalizeDelayMs = Math.max(0, expiryAtMs + graceMs - now);
        const payload: GameExpiryRequest = { sessionId, objectKey: `${userId}:${stageId}` };
        const client = this.restateClient.serviceSendClient(GAME_EXPIRY_RESTATE_TARGET);

        if (currentStatus === GAME_SESSION_STATUS.ACTIVE) {
            await client.markResultProcessing(
                payload,
                restateClients.rpc.sendOpts({
                    delay: resultProcessingDelayMs,
                    idempotencyKey: `block-fill-expiry:${sessionId}:result-processing`,
                }),
            );
        }

        await client.finalizeExpiredSession(
            payload,
            restateClients.rpc.sendOpts({
                delay: finalizeDelayMs,
                idempotencyKey: `block-fill-expiry:${sessionId}:finalize`,
            }),
        );

        this.logger.debug(`Scheduled Restate expiry handlers for block-fill session ${sessionId}`);
    }
}
