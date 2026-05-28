import {
    GAME_DEFAULTS,
    MOVE_STATUS,
    STATUS_CODES,
    TOKEN_TYPES,
    USER_TYPES,
    WRONG_MOVE_HANDLING,
} from '@common/constants';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireSession } from '@common/decorators/session.decorator';
import { SessionGuard } from '@common/guards/session.guard';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { config } from '../common/config/env.config';
import type { UserData } from '../user/http/user-http.service';

import { GameConfigParamDto } from './dto/game-config-param.dto';
import { GameOverDto } from './dto/game-over.dto';
import { NextSequenceDto } from './dto/next-sequence.dto';
import { PrevSequenceDto } from './dto/prev-sequence.dto';
import { StartGameDto } from './dto/start-game.dto';
import { ValidateGameDto } from './dto/validate-game.dto';
import { GameConfigService } from './game-config.service';
import { GameSessionRestateService } from './game-session-restate.service';
import { GameService } from './game.service';

type RawGameConfig = Awaited<ReturnType<GameConfigService['getActiveConfig']>>;

type GameConfigResponse = {
    stageId: string;
    timeLimit: number;
    minSequence: number;
    maxSequence: number;
    enableDemo: boolean;
    demoMinSequence: number;
    demoMaxSequence: number;
    flashDelay: number;
    levelDelay: number;
    bonusTimeRatio: number;
    scorePerClick: number;
    cellCount: number;
    wrongMoveHandling: number;
    totalRounds: number;
};

type PublicGameConfigResponse = GameConfigResponse & {
    totalDemoRounds: number;
};

@ApiTags('Game')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@SkipThrottle({ default: true })
@Throttle({ game: { limit: config.throttle.gameLimit, ttl: config.throttle.ttlMs } })
@Controller('v1/game')
export class GameController {
    constructor(
        private readonly gameSessionRestate: GameSessionRestateService,
        private readonly gameConfigService: GameConfigService,
        private readonly gameService: GameService,
    ) {}

    /**
     * Get the public game configuration for a stage (no internal seed values).
     *
     * @param {GameConfigParamDto} params - Route params.
     *
     * @returns {Promise<PublicGameConfigResponse>}
     */
    @Get('config/:stageId')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async getConfig(@Param() params: GameConfigParamDto): Promise<PublicGameConfigResponse> {
        const config = await this.gameConfigService.getActiveConfig(params.stageId).catch(() => {
            throw new NotFoundException(`No configuration for stage ${params.stageId}`);
        });

        return this.mapPublicConfig(this.mapConfig(config));
    }

    /**
     * Get current session status (reads from Restate state or falls back to DB).
     *
     * @param {UserData} user - The authenticated user.
     * @param {string | undefined} stageId - Stage ID query param.
     *
     * @returns {Promise<object>}
     */
    @Get('current-session')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async getCurrentSession(@CurrentUser() user: UserData, @Query('stageId') stageId?: string) {
        if (!stageId) {
            throw new NotFoundException('stageId query param is required');
        }
        return this.gameSessionRestate.getStatus(user.id, stageId);
    }

    /**
     * Start or resume a game session. Routed through Restate for serialization.
     *
     * @param {StartGameDto} dto - Start game DTO.
     * @param {UserData} user - The authenticated user.
     *
     * @returns {Promise<object>}
     */
    @Post('start')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async startGame(@Body() dto: StartGameDto, @CurrentUser() user: UserData) {
        const result = await this.gameSessionRestate.startGame(user.id, dto.stageId);
        return {
            sequence: result.sequence,
            currentRound: result.currentRound,
            current_actual_round: result.currentActualRound,
            timeDelay: result.flashDelay,
            levelDelay: result.levelDelay,
            gameSessionId: result.sessionId,
            endTime: result.endTime ?? null,
            serverTime: new Date().toISOString(),
            isResumed: result.isResumed,
            wrongMoveHandling: result.config.wrongMoveHandling,
        };
    }

    /**
     * Navigate to the previous sequence. Routed through Restate.
     *
     * @param {PrevSequenceDto} dto - Prev sequence DTO.
     * @param {UserData} user - The authenticated user.
     *
     * @returns {Promise<object>}
     */
    @Post('prev-sequence')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async prevSequence(@Body() dto: PrevSequenceDto, @CurrentUser() user: UserData) {
        const result = await this.gameSessionRestate.prevSequence(
            user.id,
            dto.stageId,
            dto.current_actual_round,
        );
        return {
            sequence: result.sequence,
            currentRound: result.currentRound,
            current_actual_round: result.currentActualRound,
            gameSessionId: result.gameSessionId,
        };
    }

    /**
     * Navigate to the next sequence. Routed through Restate.
     *
     * @param {NextSequenceDto} dto - Next sequence DTO.
     * @param {UserData} user - The authenticated user.
     *
     * @returns {Promise<object>}
     */
    @Post('next-sequence')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async nextSequence(@Body() dto: NextSequenceDto, @CurrentUser() user: UserData) {
        const result = await this.gameSessionRestate.nextSequence(
            user.id,
            dto.stageId,
            dto.current_actual_round,
        );
        return {
            sequence: result.sequence,
            currentRound: result.currentRound,
            current_actual_round: result.currentActualRound,
            gameSessionId: result.gameSessionId,
            endTime: result.endTime ? new Date(result.endTime).toISOString() : null,
        };
    }

    /**
     * Validate a completed round. Accepts the full player sequence and validates
     * each tile against Restate state in order, preserving the old HTTP contract.
     *
     * @param {ValidateGameDto} dto - Validate game DTO.
     * @param {UserData} user - The authenticated user.
     *
     * @returns {Promise<{ success: boolean; score: number; isFlagged: boolean; status: string; roundNumber: number; }>}
     */
    @Post('validate')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async validateGame(@Body() dto: ValidateGameDto, @CurrentUser() user: UserData) {
        const stageId = await this.gameService.getStageIdForSession(dto.gameSessionId, user.id);
        if (!stageId) {
            throw new NotFoundException('Game session not found');
        }

        const lastResult = (await this.gameSessionRestate.validateRound(
            user.id,
            stageId,
            dto.playerSequence,
        )) as Record<string, unknown>;

        const status = lastResult['status'] as string;
        const success =
            status === MOVE_STATUS.ROUND_SUCCESS ||
            status === MOVE_STATUS.GAME_COMPLETE ||
            status === MOVE_STATUS.SUCCESS;
        const finalScore = lastResult['finalScore'] as number | undefined;
        const currentScore = lastResult['currentScore'] as number | undefined;
        const score =
            status === MOVE_STATUS.GAME_COMPLETE
                ? finalScore ?? currentScore ?? 0
                : currentScore ?? finalScore ?? 0;

        return {
            success,
            score,
            isFlagged: false,
            status,
            roundNumber: dto.roundNumber,
        };
    }

    /**
     * End the game session (client-initiated). Routed through Restate.
     *
     * @param {GameOverDto} dto - Game over DTO.
     * @param {UserData} user - The authenticated user.
     *
     * @returns {Promise<object>}
     */
    @Post('game-over')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async gameOver(@Body() dto: GameOverDto, @CurrentUser() user: UserData) {
        const stageId = await this.gameService.getStageIdForSession(dto.gameSessionId, user.id);
        if (!stageId) {
            throw new NotFoundException('Game session not found');
        }
        return this.gameSessionRestate.endGame(user.id, stageId, dto.reason);
    }

    /**
     * Server time sync — returns Restate session expiry for client clock alignment.
     *
     * @param {UserData} user - The authenticated user.
     * @param {string | undefined} stageId - Stage ID query param.
     *
     * @returns {Promise<{ serverNow: string; expiryAt: string | null }>}
     */
    @Get('time-sync')
    @HttpCode(STATUS_CODES.OK)
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.USER] })
    async timeSync(
        @CurrentUser() user: UserData,
        @Query('gameSessionId') gameSessionId?: string,
        @Query('stageId') stageId?: string,
    ) {
        let resolvedStageId = stageId;
        if (!resolvedStageId) {
            if (!gameSessionId) {
                throw new NotFoundException('gameSessionId query param is required');
            }
            const found = await this.gameService.fetchStageIdBySessionId(gameSessionId, user.id);
            if (!found) {
                throw new NotFoundException(`No game session found for ${gameSessionId}`);
            }
            resolvedStageId = found;
        }
        const state = await this.gameSessionRestate.getStatus(user.id, resolvedStageId);
        const s = state as { endTime?: string | null; startedAtMs?: number };
        return {
            startTime: s.startedAtMs ? new Date(s.startedAtMs).toISOString() : null,
            endTime: s.endTime ?? null,
            serverNow: new Date().toISOString(),
        };
    }

    // ── Private config helpers ─────────────────────────────────────────────────

    private mapConfig(config: RawGameConfig): GameConfigResponse {
        return {
            stageId: config.stageId,
            timeLimit: config.timeLimit ?? GAME_DEFAULTS.TIME_LIMIT,
            minSequence: config.minSequence ?? GAME_DEFAULTS.INITIAL_SEQUENCE_LENGTH,
            maxSequence: config.maxSequence ?? GAME_DEFAULTS.MAX_ROUNDS,
            enableDemo: config.enableDemo ?? true,
            demoMinSequence: config.demoMinSequence ?? 0,
            demoMaxSequence: config.demoMaxSequence ?? 0,
            flashDelay: config.flashDelay ?? 0,
            levelDelay: config.levelDelay ?? 0,
            bonusTimeRatio: config.bonusTimeRatio ?? GAME_DEFAULTS.BONUS_TIME_RATIO,
            scorePerClick: config.scorePerClick ?? GAME_DEFAULTS.SCORE_PER_ROUND,
            cellCount: config.cellCount ?? GAME_DEFAULTS.CELL_COUNT,
            wrongMoveHandling: config.wrongMoveHandling ?? WRONG_MOVE_HANDLING.NEXT_SEQUENCE,
            totalRounds:
                (config.maxSequence ?? GAME_DEFAULTS.MAX_ROUNDS) -
                (config.minSequence ?? GAME_DEFAULTS.INITIAL_SEQUENCE_LENGTH) +
                1,
        };
    }

    private mapPublicConfig(config: GameConfigResponse): PublicGameConfigResponse {
        const totalDemoRounds =
            config.enableDemo &&
            config.demoMaxSequence > 0 &&
            config.demoMaxSequence >= config.demoMinSequence
                ? config.demoMaxSequence - config.demoMinSequence + 1
                : 0;
        return { ...config, totalDemoRounds };
    }
}
