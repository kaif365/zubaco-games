import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { EnableEncryption } from '../crypto/enable-encryption.decorator';
import { StartGameDto } from './dto/start-game.dto';
import { SubmitResultDto } from './dto/submit-result.dto';
import { GameOverDto } from './dto/game-over.dto';
import type { JwtPayload } from '../common/guards/session.guard';

@Controller('game')
@UseGuards(SessionGuard)
@EnableEncryption()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('start')
  async start(@CurrentUser() user: JwtPayload, @Body() dto: StartGameDto) {
    return this.gameService.startGame(user.sub, dto.stageId, dto.level);
  }

  @Post('submit')
  async submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitResultDto) {
    return this.gameService.submitResult(
      user.sub,
      dto.gameSessionId,
      dto.moves,
      dto.clientScore,
      dto.solved,
    );
  }

  @Post('game-over')
  async gameOver(@CurrentUser() user: JwtPayload, @Body() dto: GameOverDto) {
    return this.gameService.gameOver(user.sub, dto.gameSessionId, dto.reason);
  }
}
