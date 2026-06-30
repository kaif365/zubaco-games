import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { EliminationService } from './elimination.service';
import { TournamentOrchestrator } from './orchestration/tournament.orchestrator';
import { WalletModule } from '../wallet/wallet.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { ScoringModule } from '../scoring/scoring.module';
import { RngModule } from '../rng/rng.module';

@Module({
  imports: [WalletModule, ComplianceModule, ScoringModule, RngModule],
  controllers: [TournamentController],
  providers: [TournamentService, EliminationService, TournamentOrchestrator],
  exports: [TournamentService, TournamentOrchestrator],
})
export class TournamentModule {}
