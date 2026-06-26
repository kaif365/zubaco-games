import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { EliminationService } from './elimination.service';
import { TournamentSchedulerService } from './tournament-scheduler.service';
import { TournamentEventsService } from './tournament-events.service';
import { WalletModule } from '../wallet/wallet.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { NotificationModule } from '../notification/notification.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { ScoreValidatorService } from '../game-session/score-validator.service';

@Module({
  imports: [WalletModule, ComplianceModule, LeaderboardModule, NotificationModule, AntiCheatModule],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    EliminationService,
    TournamentSchedulerService,
    TournamentEventsService,
    ScoreValidatorService,
  ],
  exports: [TournamentService],
})
export class TournamentModule {}
