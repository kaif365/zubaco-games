import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { GameService } from './game.service';
import { StartGameDto } from './dto/start-game.dto';
import { SubmitGameDto } from './dto/submit-game.dto';
import { SessionGuard } from '../common/guards/session.guard';
import { EnableEncryption } from '../crypto/enable-encryption.decorator';

@Controller('game')
@UseGuards(SessionGuard)
@EnableEncryption()
export class GameController {
  constructor(private readonly gameService: GameService) {}
  @Post('start') async start(@Body() dto: StartGameDto, @Req() req: any) { return this.gameService.startGame(req.user.sub || req.user.userId, dto.stageId, dto.level); }
  @Post('submit') async submit(@Body() dto: SubmitGameDto, @Req() req: any) { return this.gameService.submitGame(req.user.sub || req.user.userId, dto); }
}
