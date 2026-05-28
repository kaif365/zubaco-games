import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { GameService } from './game.service';
import { SessionGuard } from '../common/guards/session.guard';
import { EnableEncryption } from '../crypto/enable-encryption.decorator';
import { StartGameSchema } from './dto/start-game.dto';
import { SubmitGameSchema } from './dto/submit-game.dto';

@Controller('game')
@UseGuards(SessionGuard)
@EnableEncryption()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('start')
  async start(@Body() body: unknown, @Req() req: { user: { sub: string } }) {
    const dto = StartGameSchema.parse(body);
    return this.gameService.startGame(req.user.sub, dto);
  }

  @Post('submit')
  async submit(@Body() body: unknown, @Req() req: { user: { sub: string } }) {
    const dto = SubmitGameSchema.parse(body);
    return this.gameService.submitGame(req.user.sub, dto);
  }
}
