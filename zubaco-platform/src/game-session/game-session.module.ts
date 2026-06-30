import { Module } from '@nestjs/common';
import { GameSessionController } from './game-session.controller';
import { GameSessionService } from './game-session.service';
import { ScoringModule } from '../scoring/scoring.module';
import { RngModule } from '../rng/rng.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { VerificationPipeline } from './verification/verification.pipeline';
import { DefaultGameVerifier } from './verification/default.verifier';
import { DI_GAME_VERIFIERS } from './verification/verification.types';
import { SessionCompletionService } from './completion/session-completion.service';

@Module({
  imports: [ScoringModule, RngModule, LeaderboardModule],
  controllers: [GameSessionController],
  providers: [
    GameSessionService,
    DefaultGameVerifier,
    { provide: DI_GAME_VERIFIERS, useValue: [] },
    VerificationPipeline,
    SessionCompletionService,
  ],
  exports: [GameSessionService, VerificationPipeline, SessionCompletionService],
})
export class GameSessionModule {}
