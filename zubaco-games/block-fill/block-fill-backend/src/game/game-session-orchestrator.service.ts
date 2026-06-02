import { config } from '@config';
import { Injectable, Logger } from '@nestjs/common';

import type { CompleteBoardDto } from './dto/complete-board.dto';
import type { NextBoardDto } from './dto/next-board.dto';
import type { SaveProgressDto } from './dto/save-progress.dto';
import { GameSessionRestateService } from './game-session-restate.service';
import {
    type EndGameResponse,
    GameService,
    type SessionBoardResponse,
    type SessionTimerState,
} from './game.service';

/**
 * Orchestrates game session operations using either Restate (production)
 * or direct database calls (local development without Restate server).
 *
 * Selection is based on the RESTATE_INGRESS_URL config:
 * - If present and reachable → delegate to GameSessionRestateService
 * - If absent or NODE_ENV=development with no ingress → use GameService directly
 */
@Injectable()
export class GameSessionOrchestratorService {
    private readonly logger = new Logger(GameSessionOrchestratorService.name);
    private readonly useRestate: boolean;

    constructor(
        private readonly restateService: GameSessionRestateService,
        private readonly gameService: GameService,
    ) {
        this.useRestate =
            config.nodeEnv === 'production' ||
            (!!config.restate.ingressUrl && config.restate.ingressUrl !== 'http://localhost:8080');

        if (!this.useRestate) {
            this.logger.warn(
                'Restate ingress not configured or using default localhost — using direct DB session orchestration',
            );
        }
    }

    async startSession(userId: string, stageId: string): Promise<SessionBoardResponse> {
        if (this.useRestate) {
            return this.restateService.startSession(userId, stageId);
        }
        return this.gameService.startSession(userId, stageId);
    }

    async saveProgress(
        userId: string,
        dto: SaveProgressDto,
    ): Promise<{ saved: boolean; ignored: boolean }> {
        if (this.useRestate) {
            return this.restateService.saveProgress(userId, dto);
        }
        return this.gameService.saveProgress(dto, userId);
    }

    async nextBoard(userId: string, dto: NextBoardDto): Promise<SessionBoardResponse> {
        if (this.useRestate) {
            return this.restateService.nextBoard(userId, dto);
        }
        return this.gameService.getNextBoard(dto, userId);
    }

    async completeBoard(userId: string, dto: CompleteBoardDto): Promise<unknown> {
        if (this.useRestate) {
            return this.restateService.completeBoard(userId, dto);
        }
        return this.gameService.completeBoard(dto, userId);
    }

    async endGame(userId: string, sessionId: string): Promise<EndGameResponse> {
        if (this.useRestate) {
            return this.restateService.endGame(userId, sessionId);
        }
        return this.gameService.endGame(sessionId, userId);
    }

    async getCurrentBoard(userId: string, sessionId: string): Promise<SessionBoardResponse> {
        if (this.useRestate) {
            return this.restateService.getCurrentBoard(userId, sessionId);
        }
        return this.gameService.getCurrentBoard(sessionId, userId);
    }

    async getTimerState(userId: string, sessionId: string): Promise<SessionTimerState | null> {
        if (this.useRestate) {
            return this.restateService.getTimerState(userId, sessionId);
        }
        return this.gameService.getOwnedSessionTimer(sessionId, userId);
    }
}
