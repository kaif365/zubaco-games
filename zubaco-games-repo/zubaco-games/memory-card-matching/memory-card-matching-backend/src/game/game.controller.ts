import { ERROR_CODES, STATUS_CODES } from "@common/constants";
import { AuthUser } from "@common/decorators/auth-user.decorator";
import { GameSessionGuard } from "@common/guards/game-session.guard";
import { config } from "@config";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";

import { EnableEncryption } from "../crypto/enable-encryption.decorator";

import { SaveProgressDto } from "./dto/save-progress.dto";
import { GameSessionRestateService } from "./game-session-restate.service";
import { GameService } from "./game.service";
import type {
  CompleteBoardResponse,
  CurrentSessionResponse,
  GameConfigResponse,
  GameOverResponse,
  NextLevelResponse,
  SaveProgressResponse,
  StartGameResponse,
} from "./types/game.types";

/**
 * Controller for authenticated gameplay session endpoints.
 */
@ApiTags("Game")
@ApiBearerAuth()
@UseGuards(GameSessionGuard)
@SkipThrottle({ default: true })
@Throttle({
  game: { limit: config.throttle.gameLimit, ttl: config.throttle.ttlMs },
})
@EnableEncryption()
@Controller("game/session")
export class GameController {
  /**
   * Create a new instance.
   *
   * @param {GameService} gameService - game service value.
   * @param {GameSessionRestateService} gameSessionRestate - game session restate value.
   */
  constructor(
    private readonly gameService: GameService,
    private readonly gameSessionRestate: GameSessionRestateService,
  ) {}

  /**
   * Handle get config.
   *
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<GameConfigResponse>} The asynchronous result.
   */
  @Get("game-configs")
  @ApiOperation({ summary: "Fetch the current shared memory-card game config" })
  @ApiOkResponse({ description: "Shared game configuration" })
  getConfig(@AuthUser("stageId") stageId: string): Promise<GameConfigResponse> {
    return this.gameService.getConfig(stageId);
  }

  /**
   * Handle start game.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<StartGameResponse>} The asynchronous result.
   */
  @Post("start")
  @ApiOperation({
    summary: "Create a new game session and return the first level",
  })
  @ApiOkResponse({ description: "Newly created game session" })
  startGame(
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<StartGameResponse> {
    return this.gameSessionRestate.startGame(userId, stageId);
  }

  /**
   * Handle get next level.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<NextLevelResponse>} The asynchronous result.
   */
  @Get("next-level")
  @ApiOperation({ summary: "Prefetch the next level for the active session" })
  @ApiOkResponse({ description: "Next level payload" })
  getNextLevel(
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<NextLevelResponse> {
    return this.gameSessionRestate.getNextLevel(userId, stageId);
  }

  /**
   * Handle save progress.
   *
   * @param {SaveProgressDto} body - body value.
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<SaveProgressResponse>} The asynchronous result.
   */
  @Post("save-progress")
  @HttpCode(STATUS_CODES.OK)
  @ApiOperation({
    summary: "Submit buffered card-click moves for the active level",
  })
  @ApiBody({
    type: SaveProgressDto,
    examples: {
      default: {
        summary: "Matched pair progress payload",
        value: {
          moves: [
            {
              id: "card-1",
              clickedAt: "2026-05-07T12:10:33.000Z",
              moveId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({ description: "Progress saved successfully" })
  saveProgress(
    @Body() body: SaveProgressDto,
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<SaveProgressResponse> {
    return this.gameSessionRestate.saveProgress(userId, stageId, body);
  }

  /**
   * Handle complete board.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<CompleteBoardResponse>} The asynchronous result.
   */
  @Post("complete-board")
  @HttpCode(STATUS_CODES.OK)
  @ApiOperation({
    summary: "Finalize the current level from server-side state",
  })
  @ApiOkResponse({ description: "Level completion result" })
  completeBoard(
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<CompleteBoardResponse> {
    return this.gameSessionRestate.completeBoard(userId, stageId);
  }

  /**
   * Handle get current session.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<CurrentSessionResponse>} The asynchronous result.
   */
  @Get("current")
  @ApiOperation({
    summary: "Resume the current active game session for this requester",
  })
  @ApiOkResponse({ description: "Current in-progress session" })
  getCurrentSession(
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<CurrentSessionResponse> {
    return this.gameSessionRestate.getCurrentSession(userId, stageId);
  }

  /**
   * Handle time sync.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<{ startTime: string; endTime: string; serverNow: string }>} The asynchronous result.
   */
  @Get("time-sync")
  @ApiOperation({
    summary: "Return the canonical session timer timestamps from the backend",
  })
  @ApiOkResponse({ description: "Synchronized timer payload" })
  async timeSync(
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<{ startTime: string; endTime: string; serverNow: string }> {
    const state = await this.gameSessionRestate.getTimerState(userId, stageId);

    if (!state) {
      throw new NotFoundException({
        error: ERROR_CODES.SESSION_NOT_FOUND,
        message: "The requested session was not found",
      });
    }

    return {
      startTime: new Date(state.startTimeMs).toISOString(),
      endTime: new Date(state.endTimeMs).toISOString(),
      serverNow: new Date().toISOString(),
    };
  }

  /**
   * Handle game over.
   *
   * @param {string} userId - user id value.
   * @param {string} stageId - stage id value.
   *
   * @returns {Promise<GameOverResponse>} The asynchronous result.
   */
  @Post("game-end")
  @HttpCode(STATUS_CODES.OK)
  @ApiOperation({
    summary: "Close the whole game session after all levels are completed",
  })
  @ApiOkResponse({ description: "Final game result" })
  gameOver(
    @AuthUser("userId") userId: string,
    @AuthUser("stageId") stageId: string,
  ): Promise<GameOverResponse> {
    return this.gameSessionRestate.gameOver(userId, stageId);
  }
}
