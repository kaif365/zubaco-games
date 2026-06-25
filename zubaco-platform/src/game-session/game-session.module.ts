import { Module } from '@nestjs/common';
import { GameSessionController } from './game-session.controller';
import { GameSessionService } from './game-session.service';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [ScoringModule],
  controllers: [GameSessionController],
  providers: [GameSessionService],
  exports: [GameSessionService],
})
export class GameSessionModule {}
