import { Inject, Injectable, Logger } from '@nestjs/common';
import { DefaultGameVerifier } from './default.verifier';
import {
  AuthoritativeSession,
  ClaimedResult,
  DI_GAME_VERIFIERS,
  GameVerifier,
  IntegrityOutcome,
  VerificationResult,
  VerificationStatus,
} from './verification.types';

/**
 * The single authoritative verification pipeline (GAME-002).
 *
 * Runs BEFORE leaderboard updates, tournament progression, wallet payout
 * triggers, anti-cheat enforcement, and final completion. Specialised verifiers
 * register by gameType; everything else uses the deterministic default.
 */
@Injectable()
export class VerificationPipeline {
  private readonly logger = new Logger(VerificationPipeline.name);
  private readonly registry = new Map<string, GameVerifier>();

  constructor(
    private readonly defaultVerifier: DefaultGameVerifier,
    @Inject(DI_GAME_VERIFIERS) verifiers: GameVerifier[],
  ) {
    for (const v of verifiers) this.register(v);
  }

  /** Plug in a per-game deterministic verifier without changing the pipeline. */
  register(verifier: GameVerifier): void {
    this.registry.set(verifier.gameType, verifier);
  }

  verify(session: AuthoritativeSession, claimed: ClaimedResult): VerificationResult {
    try {
      const verifier = this.registry.get(session.gameType) ?? this.defaultVerifier;
      return verifier.verify(session, claimed);
    } catch (err) {
      this.logger.warn(`Verification error for ${session.gameType}: ${(err as Error).message}`);
      return {
        status: VerificationStatus.UNVERIFIABLE,
        authoritativeScore: 0,
        maxScore: 0,
        authoritativeDurationMs: 0,
        integrity: IntegrityOutcome.DISCREPANCY,
        validated: false,
        metadata: { error: 'verifier_failure' },
      };
    }
  }
}
