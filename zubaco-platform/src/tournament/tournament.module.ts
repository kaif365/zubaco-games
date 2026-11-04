import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { EliminationService } from './elimination.service';
import { TournamentOrchestrator } from './orchestration/tournament.orchestrator';
import { RewardPayoutService } from './orchestration/reward-payout.service';
import { TournamentStageEngineService } from './orchestration/tournament-stage-engine.service';
import { CohortMatchmakingService } from './cohort/cohort-matchmaking.service';
import { WalletModule } from '../wallet/wallet.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { ScoringModule } from '../scoring/scoring.module';
import { RngModule } from '../rng/rng.module';
import { GameSessionModule } from '../game-session/game-session.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WalletModule, ComplianceModule, ScoringModule, RngModule, GameSessionModule, WsModule],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    EliminationService,
    TournamentOrchestrator,
    RewardPayoutService,
    TournamentStageEngineService,
    CohortMatchmakingService,
  ],
  exports: [
    TournamentService,
    TournamentOrchestrator,
    RewardPayoutService,
    TournamentStageEngineService,
    CohortMatchmakingService,
  ],
})
export class TournamentModule {}
