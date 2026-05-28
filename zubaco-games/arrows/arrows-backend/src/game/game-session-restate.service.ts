import { config } from '@config';
import { Injectable } from '@nestjs/common';
import * as restateClients from '@restatedev/restate-sdk-clients';

import type { SubmitMovesDto } from './dto/submit-moves.dto';
import { GAME_SESSION_RESTATE_TARGET } from './game-session.restate';
import type { BoardResponse, EndBoardResponse, GameResponse } from './game.service';

export interface SubmitMovesResponse {
    accepted: number;
    startedAt: string;
    expiryAt: string;
    gameOver?: boolean;
}

export interface EndGameResponse {
    status: number;
    totalScore: number;
    timeBonus: number;
}

interface GameSessionRestateClient {
    startGame(request: { userId: string; stageId: string }): Promise<GameResponse>;
    getStatus(request: { userId: string; stageId: string }): Promise<GameResponse>;
    nextBoard(request: { userId: string; stageId: string }): Promise<BoardResponse>;
    submitMoves(request: {
        userId: string;
        stageId: string;
        dto: SubmitMovesDto;
    }): Promise<SubmitMovesResponse>;
    endBoard(request: { userId: string; stageId: string }): Promise<EndBoardResponse>;
    endGame(request: { userId: string; stageId: string }): Promise<EndGameResponse>;
}

@Injectable()
export class GameSessionRestateService {
    private readonly restateClient = restateClients.connect({ url: config.restate.ingressUrl });

    /**
     * Create a typed Restate object client for a specific user and stage.
     *
     * @param {string} userId - Authenticated user identifier.
     * @param {string} stageId - Stage identifier from the current session.
     *
     * @returns {GameSessionRestateClient} Typed Restate client for the user's game session object.
     */
    private getClient(userId: string, stageId: string): GameSessionRestateClient {
        return this.restateClient.objectClient(
            GAME_SESSION_RESTATE_TARGET,
            this.objectKey(userId, stageId),
        ) as unknown as GameSessionRestateClient;
    }

    /**
     * Start or re-enter a game through Restate.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<GameResponse>} The asynchronous result.
     */
    async startGame(userId: string, stageId: string): Promise<GameResponse> {
        return this.getClient(userId, stageId).startGame({ userId, stageId });
    }

    /**
     * Get game status through Restate.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<GameResponse>} The asynchronous result.
     */
    async getStatus(userId: string, stageId: string): Promise<GameResponse> {
        return this.getClient(userId, stageId).getStatus({ userId, stageId });
    }

    /**
     * Route nextBoard through Restate so it is serialized with submitMoves / endBoard
     * for the same user session.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<BoardResponse>} The asynchronous result.
     */
    async nextBoard(userId: string, stageId: string): Promise<BoardResponse> {
        return this.getClient(userId, stageId).nextBoard({ userId, stageId });
    }

    /**
     * Route submitMoves through Restate so concurrent FE calls are queued, not raced.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     * @param {SubmitMovesDto} dto - dto value.
     *
     * @returns {Promise<SubmitMovesResponse>} The asynchronous result.
     */
    async submitMoves(
        userId: string,
        stageId: string,
        dto: SubmitMovesDto,
    ): Promise<SubmitMovesResponse> {
        return this.getClient(userId, stageId).submitMoves({ userId, stageId, dto });
    }

    /**
     * Route endBoard through Restate for the same serialization guarantee.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<EndBoardResponse>} The asynchronous result.
     */
    async endBoard(userId: string, stageId: string): Promise<EndBoardResponse> {
        return this.getClient(userId, stageId).endBoard({ userId, stageId });
    }

    /**
     * Route endGame through Restate for the same serialization guarantee.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {Promise<EndGameResponse>} The asynchronous result.
     */
    async endGame(userId: string, stageId: string): Promise<EndGameResponse> {
        return this.getClient(userId, stageId).endGame({ userId, stageId });
    }

    /**
     * Build the Restate Virtual Object key for this user's game session.
     *
     * We intentionally use `userId:stageId` rather than the DB `sessionId` because:
     * - Both values are already present in every request via the JWT (no extra lookup needed).
     * - `userId` is verified by the auth guard, so a user cannot construct a key that
     *   targets another person's session — the security boundary is the JWT itself.
     * - The key only needs to be unique per concurrent-execution domain; `userId:stageId`
     *   satisfies that just as well as `sessionId` would.
     *
     * @param {string} userId - user id value.
     * @param {string} stageId - stage id value.
     *
     * @returns {string} The string result.
     */
    private objectKey(userId: string, stageId: string): string {
        return `${userId}:${stageId}`;
    }
}
