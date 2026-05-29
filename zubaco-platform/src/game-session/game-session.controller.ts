import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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
