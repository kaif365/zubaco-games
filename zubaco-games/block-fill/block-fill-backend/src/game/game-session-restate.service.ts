import { config } from '@config';
import { Injectable } from '@nestjs/common';
import * as restateClients from '@restatedev/restate-sdk-clients';

import type { CompleteBoardDto } from './dto/complete-board.dto';
import type { NextBoardDto } from './dto/next-board.dto';
import type { SaveProgressDto } from './dto/save-progress.dto';
import { GAME_SESSION_RESTATE_TARGET } from './game-session.restate';
import {
    type EndGameResponse,
    GameService,
    type SessionBoardResponse,
    type SessionTimerState,
} from './game.service';

interface GameSessionObjectClient {
    startSession(payload: { userId: string; stageId: string }): Promise<SessionBoardResponse>;
    saveProgress(payload: {
        userId: string;
        stageId: string;
        dto: SaveProgressDto;
    }): Promise<{ saved: boolean; ignored: boolean }>;
    nextBoard(payload: {
        userId: string;
        stageId: string;
        dto: NextBoardDto;
    }): Promise<SessionBoardResponse>;
    completeBoard(payload: {
        userId: string;
        stageId: string;
        dto: CompleteBoardDto;
    }): Promise<unknown>;
    endGame(payload: {
        userId: string;
        stageId: string;
        sessionId: string;
    }): Promise<EndGameResponse>;
    getCurrentBoard(payload: {
        userId: string;
        stageId: string;
        sessionId: string;
    }): Promise<SessionBoardResponse>;
    getTimerState(payload: {
        userId: string;
        stageId: string;
        sessionId: string;
    }): Promise<SessionTimerState | null>;
}

interface RestateObjectRouterClient {
    objectClient(
        target: typeof GAME_SESSION_RESTATE_TARGET,
        objectKey: string,
    ): GameSessionObjectClient;
}

function createRestateClient(): RestateObjectRouterClient {
    // Restate client types are currently too loose for eslint's unsafe-* rules.

    const client = restateClients.connect({
        url: config.restate.ingressUrl,
    }) as unknown as RestateObjectRouterClient;
    return client;
}

@Injectable()
export class GameSessionRestateService {
    private readonly restateClient = createRestateClient();

    constructor(private readonly gameService: GameService) {}

    /**
     * Starts a Restate-backed session workflow for a user and stage.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @returns {Promise<unknown>} The Restate start-session result.
     */
    startSession(userId: string, stageId: string): Promise<SessionBoardResponse> {
        return this.getObjectClient(userId, stageId).startSession({ userId, stageId });
    }

    /**
     * Routes a save-progress request to the correct Restate object.
     * @param {string} userId - The authenticated user identifier.
     * @param {SaveProgressDto} dto - The save-progress payload.
     * @returns {Promise<unknown>} The Restate save-progress result.
     */
    async saveProgress(
        userId: string,
        dto: SaveProgressDto,
    ): Promise<{ saved: boolean; ignored: boolean }> {
        const route = await this.gameService.resolveSessionRoutingInfo(dto.sessionId, userId);
        return this.getObjectClient(userId, route.stageId).saveProgress({
            userId,
            stageId: route.stageId,
            dto,
        });
    }

    /**
     * Routes a next-board request to the correct Restate object.
     * @param {string} userId - The authenticated user identifier.
     * @param {NextBoardDto} dto - The next-board payload.
     * @returns {Promise<unknown>} The Restate next-board result.
     */
    async nextBoard(userId: string, dto: NextBoardDto): Promise<SessionBoardResponse> {
        const route = await this.gameService.resolveSessionRoutingInfo(dto.sessionId, userId);
        return this.getObjectClient(userId, route.stageId).nextBoard({
            userId,
            stageId: route.stageId,
            dto,
        });
    }

    /**
     * Routes a complete-board request to the correct Restate object.
     * @param {string} userId - The authenticated user identifier.
     * @param {CompleteBoardDto} dto - The complete-board payload.
     * @returns {Promise<unknown>} The Restate complete-board result.
     */
    async completeBoard(userId: string, dto: CompleteBoardDto): Promise<unknown> {
        const route = await this.gameService.resolveSessionRoutingInfo(dto.sessionId, userId);
        return this.getObjectClient(userId, route.stageId).completeBoard({
            userId,
            stageId: route.stageId,
            dto,
        });
    }

    /**
     * Routes a game-end request to the correct Restate object.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} sessionId - The session identifier.
     * @returns {Promise<unknown>} The Restate end-game result.
     */
    async endGame(userId: string, sessionId: string): Promise<EndGameResponse> {
        const route = await this.gameService.resolveSessionRoutingInfo(sessionId, userId);
        return this.getObjectClient(userId, route.stageId).endGame({
            userId,
            stageId: route.stageId,
            sessionId,
        });
    }

    /**
     * Fetches the current board state from the Restate workflow.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} sessionId - The session identifier.
     * @returns {Promise<unknown>} The Restate current-board result.
     */
    async getCurrentBoard(userId: string, sessionId: string): Promise<SessionBoardResponse> {
        const route = await this.gameService.resolveSessionRoutingInfo(sessionId, userId);
        return this.getObjectClient(userId, route.stageId).getCurrentBoard({
            userId,
            stageId: route.stageId,
            sessionId,
        });
    }

    /**
     * Fetches timer state from the Restate workflow.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} sessionId - The session identifier.
     * @returns {Promise<unknown>} The Restate timer-state result.
     */
    async getTimerState(userId: string, sessionId: string): Promise<SessionTimerState | null> {
        const route = await this.gameService.resolveSessionRoutingInfo(sessionId, userId);
        return this.getObjectClient(userId, route.stageId).getTimerState({
            userId,
            stageId: route.stageId,
            sessionId,
        });
    }

    private getObjectClient(userId: string, stageId: string): GameSessionObjectClient {
        return this.restateClient.objectClient(
            GAME_SESSION_RESTATE_TARGET,
            this.objectKey(userId, stageId),
        );
    }

    /**
     * Builds the Restate object key for a user and stage pair.
     * @param {string} userId - The authenticated user identifier.
     * @param {string} stageId - The stage identifier.
     * @returns {string} The Restate object key.
     */
    private objectKey(userId: string, stageId: string): string {
        return `${userId}:${stageId}`;
    }
}
