import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { EliminationService } from './elimination.service';
import { WalletModule } from '../wallet/wallet.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [WalletModule, ComplianceModule, ScoringModule],
  controllers: [TournamentController],
  providers: [TournamentService, EliminationService],
  exports: [TournamentService],
})
export class TournamentModule {}
