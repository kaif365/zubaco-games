import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { EliminationService } from './elimination.service';
import { TournamentSchedulerService } from './tournament-scheduler.service';
import { WalletModule } from '../wallet/wallet.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [WalletModule, ComplianceModule, LeaderboardModule, NotificationModule],
  controllers: [TournamentController],
  providers: [TournamentService, EliminationService, TournamentSchedulerService],
  exports: [TournamentService],
})
export class TournamentModule {}
