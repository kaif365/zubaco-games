import { Injectable } from '@nestjs/common';
import { ScoringService } from '../../scoring/scoring.service';
import {
  AuthoritativeSession,
  ClaimedResult,
  GameVerifier,
  IntegrityOutcome,
  VerificationResult,
  VerificationStatus,
} from './verification.types';

/**
 * Default deterministic verifier used for every game type that does not register
 * a specialised verifier. It re-derives the authoritative score from the
 * server-side ScoringService over verifiable metadata, enforces the server seed
 * fingerprint, bounds the duration to the session age, and classifies integrity.
 * Specialised per-game verifiers may extend/override via the registry.
 */
@Injectable()
export class DefaultGameVerifier implements GameVerifier {
  readonly gameType = '*';

  constructor(private readonly scoring: ScoringService) {}

  verify(session: AuthoritativeSession, claimed: ClaimedResult): VerificationResult {
    // Bound duration to the real elapsed session age — never client-trusted.
    const elapsed = Date.now() - session.startedAt.getTime();
    const authoritativeDurationMs = Math.max(0, Math.min(claimed.durationMs, elapsed + 5000));

    // Board fingerprint tamper check.
    let integrity: IntegrityOutcome = IntegrityOutcome.CLEAN;
    if (session.storedPuzzle?.fingerprint && claimed.metadata?.board_fingerprint) {
      if (claimed.metadata.board_fingerprint !== session.storedPuzzle.fingerprint) {
        integrity = IntegrityOutcome.TAMPERED;
      }
    }

    const scoringMeta = { ...(claimed.metadata || {}) };
    if (session.storedPuzzle?.meta?.shortest_path && Array.isArray(scoringMeta.rounds)) {
      scoringMeta.rounds = scoringMeta.rounds.map((r: any) => ({
        ...r,
        shortestPath: r.shortestPath ?? session.storedPuzzle.meta.shortest_path,
      }));
    }

    const result = this.scoring.score(session.gameType, scoringMeta, session.config);
    const authoritativeScore =
      integrity === IntegrityOutcome.TAMPERED
        ? 0
        : result.validated
        ? result.score
        : Math.max(0, Math.min(claimed.score ?? 0, result.maxScore));

    const discrepancy =
      claimed.score !== null && result.validated ? Math.abs(claimed.score - result.score) : 0;
    if (integrity === IntegrityOutcome.CLEAN && discrepancy > Math.max(10, result.maxScore * 0.1)) {
      integrity = IntegrityOutcome.DISCREPANCY;
    }

    const status =
      integrity === IntegrityOutcome.TAMPERED
        ? VerificationStatus.REJECTED
        : result.validated
        ? VerificationStatus.VERIFIED
        : VerificationStatus.UNVERIFIABLE;

    return {
      status,
      authoritativeScore,
      maxScore: result.maxScore,
      authoritativeDurationMs,
      integrity,
      validated: result.validated,
      metadata: {
        claimed_score: claimed.score,
        server_score: result.score,
        discrepancy,
        breakdown: result.breakdown,
      },
    };
  }
}
