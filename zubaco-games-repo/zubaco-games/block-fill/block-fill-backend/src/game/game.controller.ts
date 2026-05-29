import { AuthUser } from '@common/decorators/auth-user.decorator';
import {
    RequireSession,
    SESSION_AUTH_MODE,
    TOKEN_TYPES,
    USER_TYPES,
} from '@common/decorators/session.decorator';
import { Transactional } from '@common/decorators/transactional.decorator';
import { SessionGuard } from '@common/guards/session.guard';
import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CompleteBoardDto } from './dto/complete-board.dto';
import { EndGameDto } from './dto/end-game.dto';
import { GetGameConfigDto } from './dto/get-game-config.dto';
import { NextBoardDto } from './dto/next-board.dto';
import { SaveProgressDto } from './dto/save-progress.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { TimeSyncDto } from './dto/time-sync.dto';
import { GameSessionRestateService } from './game-session-restate.service';
import { GameService, type SessionTimerState } from './game.service';

@ApiTags('Game Session')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('game/session')
export class GameController {
    constructor(
        private readonly gameService: GameService,
        private readonly gameSessionRestate: GameSessionRestateService,
    ) {}

    /**
     * Fetches the playable configuration for a stage.
     * @param {GetGameConfigDto} dto - The query payload containing the stage identifier.
     * @returns {Promise<import('./game.service').SessionGameConfigResponse>} The stage game configuration.
     */
    @Get('game-configs')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    @Transactional({ readOnly: true })
    getGameConfig(@Query() dto: GetGameConfigDto) {
        return this.gameService.getGameConfig(dto.stageId);
    }

    /**
     * Starts a new game session for a user and stage.
     * @param {StartSessionDto} dto - The payload containing the stage identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<import('./game.service').SessionBoardResponse>} The first board response for the session.
     */
    @Post('start')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    start(@Body() dto: StartSessionDto, @AuthUser('userId') userId: string) {
        return this.gameSessionRestate.startSession(userId, dto.stageId);
    }

    /**
     * Saves incremental path progress for the active board.
     * @param {SaveProgressDto} dto - The payload containing board paths and move identifiers.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<unknown>} The save-progress result.
     */
    @Post('save-progress')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    saveProgress(@Body() dto: SaveProgressDto, @AuthUser('userId') userId: string) {
        return this.gameSessionRestate.saveProgress(userId, dto);
    }

    /**
     * Fetches a specific board view for the session.
     * @param {NextBoardDto} dto - The payload containing the requested round information.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<import('./game.service').SessionBoardResponse>} The requested board response.
     */
    @Post('next-board')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    nextBoard(@Body() dto: NextBoardDto, @AuthUser('userId') userId: string) {
        return this.gameSessionRestate.nextBoard(userId, dto);
    }

    /**
     * Completes the current board after validating the submitted solution.
     * @param {CompleteBoardDto} dto - The payload containing the completed board paths.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<import('./game.service').CompleteBoardResponse>} The board completion response.
     */
    @Post('complete-board')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    completeBoard(@Body() dto: CompleteBoardDto, @AuthUser('userId') userId: string) {
        return this.gameSessionRestate.completeBoard(userId, dto);
    }

    /**
     * Fetches the current active board for a session.
     * @param {string} sessionId - The session identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<import('./game.service').SessionBoardResponse>} The current board response.
     */
    @Get(':sessionId/current-board')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    getCurrentBoard(@Param('sessionId') sessionId: string, @AuthUser('userId') userId: string) {
        return this.gameSessionRestate.getCurrentBoard(userId, sessionId);
    }

    /**
     * Returns server-side timing information for a session.
     * @param {TimeSyncDto} dto - The query payload containing the session identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<{ startTime: string | null; endTime: string | null; serverNow: string }>} The timer sync payload.
     */
    @Get('time-sync')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    @Transactional({ readOnly: true })
    async timeSync(@Query() dto: TimeSyncDto, @AuthUser('userId') userId: string) {
        const state: SessionTimerState | null = await this.gameSessionRestate.getTimerState(
            userId,
            dto.sessionId,
        );
        if (!state) {
            throw new NotFoundException(`No game session found for ${dto.sessionId}`);
        }

        return {
            startTime: state.startTimeMs ? new Date(state.startTimeMs).toISOString() : null,
            endTime: state.endTimeMs ? new Date(state.endTimeMs).toISOString() : null,
            serverNow: new Date().toISOString(),
        };
    }

    /**
     * Ends an in-progress game session.
     * @param {EndGameDto} dto - The payload containing the session identifier.
     * @param {string} userId - The authenticated user identifier.
     * @returns {Promise<import('./game.service').EndGameResponse>} The final game result payload.
     */
    @Post('game-end')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    endGame(@Body() dto: EndGameDto, @AuthUser('userId') userId: string) {
        return this.gameSessionRestate.endGame(userId, dto.sessionId);
    }
}
