import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { TournamentLeaderboardService } from './tournament-leaderboard.service';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, TournamentLeaderboardService],
  exports: [LeaderboardService, TournamentLeaderboardService],
})
export class LeaderboardModule {}
