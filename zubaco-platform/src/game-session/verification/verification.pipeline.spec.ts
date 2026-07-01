import { ScoringService } from '../../scoring/scoring.service';
import { DefaultGameVerifier } from './default.verifier';
import { VerificationPipeline } from './verification.pipeline';
import {
  AuthoritativeSession,
  ClaimedResult,
  GameVerifier,
  IntegrityOutcome,
  VerificationResult,
  VerificationStatus,
} from './verification.types';

/**
 * Unit tests for the server-authoritative verification pipeline (GAME-002).
 *
 * The pipeline + default verifier are pure once given a ScoringService (itself
 * dependency-free). These tests pin the security guarantees that run BEFORE any
 * leaderboard/tournament/wallet side effect:
 *   - client score/duration are never trusted (clamped / re-derived),
 *   - board-fingerprint tampering forces REJECTED with a zero score,
 *   - a per-game verifier is dispatched over the default,
 *   - a verifier that throws degrades safely to UNVERIFIABLE (never crashes the
 *     completion flow).
 */
describe('VerificationPipeline + DefaultGameVerifier', () => {
  let scoring: ScoringService;
  let defaultVerifier: DefaultGameVerifier;

  beforeEach(() => {
    scoring = new ScoringService();
    defaultVerifier = new DefaultGameVerifier(scoring);
  });

  const makeSession = (over: Partial<AuthoritativeSession> = {}): AuthoritativeSession => ({
    id: 'sess-1',
    userId: 'user-1',
    gameType: 'SLIDING_PUZZLE',
    mode: 'PRACTICE',
    config: {},
    serverSeed: 'server-seed',
    clientSeed: null,
    nonce: 1,
    startedAt: new Date(Date.now() - 10_000),
    metadata: {},
    ...over,
  });

  const makeClaim = (over: Partial<ClaimedResult> = {}): ClaimedResult => ({
    score: 100,
    durationMs: 8_000,
    metadata: {},
    ...over,
  });

  const pipelineWith = (...verifiers: GameVerifier[]): VerificationPipeline =>
    new VerificationPipeline(defaultVerifier, verifiers);

  describe('DefaultGameVerifier — untrusted inputs', () => {
    it('clamps a wildly inflated client duration to the elapsed session age (+5s)', () => {
      const session = makeSession({ startedAt: new Date(Date.now() - 10_000) });
      const claim = makeClaim({ durationMs: 999_999_999 });

      const result = defaultVerifier.verify(session, claim);

      // Never trust the claim: bounded to elapsed (~10s) + 5s grace.
      expect(result.authoritativeDurationMs).toBeLessThanOrEqual(10_000 + 5_000 + 50);
      expect(result.authoritativeDurationMs).toBeLessThan(claim.durationMs);
    });

    it('never returns a negative authoritative duration', () => {
      const result = defaultVerifier.verify(makeSession(), makeClaim({ durationMs: -5_000 }));
      expect(result.authoritativeDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('flags a board-fingerprint mismatch as TAMPERED and zeroes the score', () => {
      const session = makeSession({ storedPuzzle: { fingerprint: 'genuine-fp' } });
      const claim = makeClaim({ score: 5000, metadata: { board_fingerprint: 'forged-fp' } });

      const result = defaultVerifier.verify(session, claim);

      expect(result.integrity).toBe(IntegrityOutcome.TAMPERED);
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.authoritativeScore).toBe(0);
    });

    it('does not flag tampering when the fingerprint matches', () => {
      const session = makeSession({ storedPuzzle: { fingerprint: 'genuine-fp' } });
      const claim = makeClaim({ metadata: { board_fingerprint: 'genuine-fp' } });

      const result = defaultVerifier.verify(session, claim);

      expect(result.integrity).not.toBe(IntegrityOutcome.TAMPERED);
      expect(result.status).not.toBe(VerificationStatus.REJECTED);
    });

    it('echoes the claimed vs server score for downstream anti-cheat diffing', () => {
      const result = defaultVerifier.verify(makeSession(), makeClaim({ score: 100 }));
      expect(result.metadata).toHaveProperty('claimed_score', 100);
      expect(result.metadata).toHaveProperty('server_score');
      expect(result.metadata).toHaveProperty('discrepancy');
    });
  });

  describe('VerificationPipeline — dispatch', () => {
    it('routes to the default verifier for an unregistered game type', () => {
      const pipeline = pipelineWith();
      const result = pipeline.verify(makeSession({ gameType: 'UNKNOWN_GAME' }), makeClaim());
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('authoritativeScore');
    });

    it('dispatches to a registered per-game verifier over the default', () => {
      const sentinel: VerificationResult = {
        status: VerificationStatus.VERIFIED,
        authoritativeScore: 4242,
        maxScore: 5000,
        authoritativeDurationMs: 1234,
        integrity: IntegrityOutcome.CLEAN,
        validated: true,
        metadata: { custom: true },
      };
      const custom: GameVerifier = {
        gameType: 'ARROWS',
        verify: jest.fn().mockReturnValue(sentinel),
      };

      const pipeline = pipelineWith(custom);
      const result = pipeline.verify(makeSession({ gameType: 'ARROWS' }), makeClaim());

      expect(custom.verify).toHaveBeenCalledTimes(1);
      expect(result).toEqual(sentinel);
    });

    it('degrades to UNVERIFIABLE (never throws) when a verifier fails internally', () => {
      const exploding: GameVerifier = {
        gameType: 'ARROWS',
        verify: jest.fn(() => {
          throw new Error('boom');
        }),
      };

      const pipeline = pipelineWith(exploding);
      let result!: VerificationResult;
      expect(() => {
        result = pipeline.verify(makeSession({ gameType: 'ARROWS' }), makeClaim());
      }).not.toThrow();

      expect(result.status).toBe(VerificationStatus.UNVERIFIABLE);
      expect(result.authoritativeScore).toBe(0);
      expect(result.validated).toBe(false);
      expect(result.metadata).toHaveProperty('error', 'verifier_failure');
    });
  });
});
