import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionGuard } from '../common/guards/session.guard';
import { EnableEncryption } from '../crypto/enable-encryption.decorator';
import { GameOverDto } from './dto/game-over.dto';
import { StartGameDto } from './dto/start-game.dto';
import { SubmitResultDto } from './dto/submit-result.dto';
import { GameService } from './game.service';

interface UserData { id: string; name: string; }

@ApiTags('Game')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@EnableEncryption()
@Controller('v1/game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('config')
  @HttpCode(200)
  async getConfig(@Query('stageId') stageId: string) {
    return this.gameService.fetchStageConfig(stageId);
  }

  @Post('start')
  @HttpCode(200)
  async startGame(@Body() dto: StartGameDto, @CurrentUser() user: UserData) {
    return this.gameService.startGame(user.id, dto.stageId, dto.level);
  }

  @Post('submit')
  @HttpCode(200)
  async submitResult(@Body() dto: SubmitResultDto, @CurrentUser() user: UserData) {
    return this.gameService.submitResult(user.id, dto.gameSessionId, dto.placements, dto.clientScore);
  }

  @Post('game-over')
  @HttpCode(200)
  async gameOver(@Body() dto: GameOverDto, @CurrentUser() user: UserData) {
    return this.gameService.endGame(user.id, dto.gameSessionId, dto.reason);
  }
}
