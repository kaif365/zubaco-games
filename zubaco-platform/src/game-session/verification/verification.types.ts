/**
 * Universal server-authoritative verification framework (GAME-002).
 *
 * Every completed session — regardless of game type or execution engine
 * (Restate, direct service, legacy) — passes through ONE pipeline. The pipeline
 * loads the authoritative session, dispatches to the correct registered
 * verifier, deterministically re-derives the result, and emits one canonical
 * VerificationResult. No client-provided score/duration/moves ever become
 * authoritative — they are only diffed for integrity.
 */

export enum VerificationStatus {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  UNVERIFIABLE = 'UNVERIFIABLE',
}

export enum IntegrityOutcome {
  CLEAN = 'CLEAN',
  DISCREPANCY = 'DISCREPANCY',
  TAMPERED = 'TAMPERED',
}

/** Authoritative session snapshot handed to every verifier (read-only). */
export interface AuthoritativeSession {
  id: string;
  userId: string;
  gameType: string;
  mode: string;
  config: any;
  serverSeed: string;
  clientSeed: string | null;
  nonce: number;
  startedAt: Date;
  metadata: any;
  storedPuzzle?: any;
}

/** Untrusted, client-claimed values — diffed only, never authoritative. */
export interface ClaimedResult {
  score: number | null;
  durationMs: number;
  metadata: any;
}

export interface VerificationResult {
  status: VerificationStatus;
  authoritativeScore: number;
  maxScore: number;
  authoritativeDurationMs: number;
  integrity: IntegrityOutcome;
  validated: boolean;
  metadata: Record<string, any>;
}

/** Every game plugs in one deterministic verifier without touching the pipeline. */
export interface GameVerifier {
  readonly gameType: string;
  verify(session: AuthoritativeSession, claimed: ClaimedResult): VerificationResult;
}

export const DI_GAME_VERIFIERS = 'DI_GAME_VERIFIERS';
