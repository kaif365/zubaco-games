import { Module } from '@nestjs/common';
import { GameSessionController, InternalGameController } from './game-session.controller';
import { GameSessionService } from './game-session.service';
import { ScoreValidatorService } from './score-validator.service';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [AntiCheatModule, LeaderboardModule],
  controllers: [GameSessionController],
  providers: [GameSessionService, ScoreValidatorService],
  exports: [GameSessionService],
})
export class GameSessionModule {}
