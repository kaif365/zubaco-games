import { config } from '@config';
import { Injectable } from '@nestjs/common';
import * as restateClients from '@restatedev/restate-sdk-clients';

import { GAME_SESSION_RESTATE_TARGET } from './game-session.restate';

@Injectable()
export class GameSessionRestateService {
    private readonly restateClient = restateClients.connect({ url: config.restate.ingressUrl });

    /**
     * Start or resume a game session for `userId` on `stageId`.
     *
     * All calls for the same key are serialized by the Restate Virtual Object —
     * concurrent requests queue instead of racing.
     */
    async startGame(userId: string, stageId: string) {
        return this.restateClient
            .objectClient(GAME_SESSION_RESTATE_TARGET, this.objectKey(userId, stageId))
            .startGame({ userId, stageId });
    }

    async getStatus(userId: string, stageId: string) {
        return this.restateClient
            .objectClient(GAME_SESSION_RESTATE_TARGET, this.objectKey(userId, stageId))
            .getStatus({ userId, stageId });
    }

    async validateMove(userId: string, stageId: string, tileId: number) {
        return this.restateClient
            .objectClient(GAME_SESSION_RESTATE_TARGET, this.objectKey(userId, stageId))
            .validateMove({ userId, stageId, tileId });
    }

    async validateRound(userId: string, stageId: string, playerSequence: number[]) {
        return this.restateClient
            .objectClient(GAME_SESSION_RESTATE_TARGET, this.objectKey(userId, stageId))
            .validateRound({ userId, stageId, playerSequence });
    }

    async prevSequence(userId: string, stageId: string, currentActualRound: number) {
        return this.restateClient
            .objectClient(GAME_SESSION_RESTATE_TARGET, this.objectKey(userId, stageId))
            .prevSequence({ userId, stageId, currentActualRound });
    }

    async nextSequence(userId: string, stageId: string, requestedActualRound: number) {
        return this.restateClient
            .objectClient(GAME_SESSION_RESTATE_TARGET, this.objectKey(userId, stageId))
            .nextSequence({ userId, stageId, requestedActualRound });
    }

    async endGame(userId: string, stageId: string, reason: 'COMPLETED' | 'TIME_UP' | 'WRONG_MOVE') {
        return this.restateClient
            .objectClient(GAME_SESSION_RESTATE_TARGET, this.objectKey(userId, stageId))
            .endGame({ userId, stageId, reason });
    }

    /**
     * Build the Restate Virtual Object key.
     *
     * Using `userId:stageId` rather than `sessionId` means:
     * - Both values are already in the JWT — no extra DB lookup.
     * - The user cannot forge a key targeting another user's session.
     * - The key is unique per concurrent-execution domain.
     */
    private objectKey(userId: string, stageId: string): string {
        return `${userId}:${stageId}`;
    }
}
