import { Module } from '@nestjs/common';
import { FreePlayController } from './free-play.controller';
import { FreePlayService } from './free-play.service';
import { EnergyService } from './energy.service';
import { ScoreValidatorService } from '../game-session/score-validator.service';
import { UsersModule } from '../users/users.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [UsersModule, AntiCheatModule, LeaderboardModule],
  controllers: [FreePlayController],
  providers: [FreePlayService, EnergyService, ScoreValidatorService],
  exports: [FreePlayService, EnergyService],
})
export class FreePlayModule {}
