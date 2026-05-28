import { STATUS_CODES } from "@common/constants";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import {
  RequireSession,
  TOKEN_TYPES,
  USER_TYPES,
} from "@common/decorators/session.decorator";
import { SessionGuard } from "@common/guards/session.guard";
import { config } from "@config";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";

import { EnableEncryption } from "../crypto/enable-encryption.decorator";

import { SubmitMovesDto } from "./dto/submit-moves.dto";
import { GameSessionRestateService } from "./game-session-restate.service";

interface GameUser {
  id: string;
  stageId: string;
}

@ApiTags("Game")
@ApiBearerAuth()
@UseGuards(SessionGuard)
@SkipThrottle({ default: true })
@Throttle({
  game: { limit: config.throttle.gameLimit, ttl: config.throttle.ttlMs },
})
@EnableEncryption()
@Controller("v1/game")
export class GameController {
  /**
   * Create a new instance.
   *
   * @param {GameSessionRestateService} gameSessionRestate - Restate client for all game handlers.
   */
  constructor(private readonly gameSessionRestate: GameSessionRestateService) {}

  /**
   * Handle game start.
   *
   * @param {GameUser} user - user value.
   *
   * @returns {Promise<GameResponse>} The asynchronous result.
   */
  @Post("game-start")
  @HttpCode(STATUS_CODES.OK)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.USER],
  })
  gameStart(@CurrentUser() user: GameUser) {
    return this.gameSessionRestate.startGame(user.id, user.stageId);
  }

  /**
   * Handle next level.
   *
   * @param {GameUser} user - user value.
   *
   * @returns {Promise<BoardResponse>} The asynchronous result.
   */
  @Get("next-level")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.USER],
  })
  nextLevel(@CurrentUser() user: GameUser) {
    return this.gameSessionRestate.nextLevel(user.id, user.stageId);
  }

  /**
   * Handle submit moves.
   *
   * @param {GameUser} user - user value.
   * @param {SubmitMovesDto} dto - dto value.
   *
   * @returns {Promise<{ accepted: number; startedAt: string; expiryAt: string; }>} The asynchronous result.
   */
  @Post("submit-moves")
  @HttpCode(STATUS_CODES.OK)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.USER],
  })
  submitMoves(@CurrentUser() user: GameUser, @Body() dto: SubmitMovesDto) {
    return this.gameSessionRestate.submitMoves(user.id, user.stageId, dto);
  }

  /**
   * Handle end board.
   *
   * @param {GameUser} user - user value.
   *
   * @returns {Promise<EndBoardResponse>} The asynchronous result.
   */
  @Post("end-board")
  @HttpCode(STATUS_CODES.OK)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.USER],
  })
  endBoard(@CurrentUser() user: GameUser) {
    return this.gameSessionRestate.endBoard(user.id, user.stageId);
  }

  /**
   * Handle end game.
   *
   * @param {GameUser} user - user value.
   *
   * @returns {Promise<{ status: number; totalScore: number; timeBonus: number; }>} The asynchronous result.
   */
  @Post("end-game")
  @HttpCode(STATUS_CODES.OK)
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.USER],
  })
  endGame(@CurrentUser() user: GameUser) {
    return this.gameSessionRestate.endGame(user.id, user.stageId);
  }

  /**
   * Get status.
   *
   * @param {GameUser} user - user value.
   *
   * @returns {Promise<GameResponse>} The asynchronous result.
   */
  @Get("status")
  @RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.USER],
  })
  getStatus(@CurrentUser() user: GameUser) {
    return this.gameSessionRestate.getStatus(user.id, user.stageId);
  }
}
