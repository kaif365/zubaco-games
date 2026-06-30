import { Module } from '@nestjs/common';
import { GameSessionController, InternalGameController } from './game-session.controller';
import { GameSessionService } from './game-session.service';
import { ScoreValidatorService } from './score-validator.service';
import { SessionReaperService } from './session-reaper.service';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [AntiCheatModule, LeaderboardModule],
  controllers: [GameSessionController, InternalGameController],
  providers: [GameSessionService, ScoreValidatorService, SessionReaperService],
  exports: [GameSessionService],
})
export class GameSessionModule {}
