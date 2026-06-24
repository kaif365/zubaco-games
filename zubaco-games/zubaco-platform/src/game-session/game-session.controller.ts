import { Controller, Get, Post, Body, Param, Headers, UseGuards, UnauthorizedException } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StartGameDto, SubmitGameResultDto, StartTournamentGameDto } from './dto/game-session.dto';

@Controller('game-session')
@UseGuards(JwtAuthGuard)
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post('start')
  async startGame(@CurrentUser() userId: string, @Body() dto: StartGameDto) {
    return this.gameSessionService.startGame(userId, dto.game_type, dto.config);
  }

  @Post('tournament/start')
  async startTournamentGame(@CurrentUser() userId: string, @Body() dto: StartTournamentGameDto) {
    return this.gameSessionService.startTournamentGame(userId, dto.stage_game_id, dto.stage_entry_id);
  }

  @Get(':sessionId/state')
  async getState(@CurrentUser() userId: string, @Param('sessionId') sessionId: string) {
    return this.gameSessionService.getSessionState(sessionId, userId);
  }

  @Post(':sessionId/submit')
  async submitResult(
    @CurrentUser() userId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitGameResultDto,
  ) {
    return this.gameSessionService.submitResult(sessionId, userId, dto.score, dto.duration_ms, dto.metadata);
  }
}

/**
 * Internal API for game backends to report game completion.
 * Protected by API key (not user JWT) — game backends call this after gameplay ends.
 * This is the bridge between individual game backends and the platform.
 */
@Controller('internal/game')
export class InternalGameController {
  private readonly INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post('complete')
  async gameComplete(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: { sessionId: string; userId: string; score: number; durationMs: number; gameType: string; metadata?: any },
  ) {
    if (!this.INTERNAL_API_KEY || apiKey !== this.INTERNAL_API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }

    return this.gameSessionService.submitResult(
      dto.sessionId,
      dto.userId,
      dto.score,
      dto.durationMs,
      dto.metadata,
    );
  }

  @Post('start')
  async gameStart(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: { userId: string; gameType: string; config?: any; mode?: string },
  ) {
    if (!this.INTERNAL_API_KEY || apiKey !== this.INTERNAL_API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }

    return this.gameSessionService.startGame(dto.userId, dto.gameType, dto.config);
  }
}
