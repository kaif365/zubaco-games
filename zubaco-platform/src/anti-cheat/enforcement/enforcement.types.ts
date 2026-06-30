/**
 * Authoritative transactional anti-cheat enforcement (ACHEAT-001).
 *
 * Detection (analyzeGameResult/flags) feeds confirmed verdicts into this engine,
 * which performs all money-bearing reversals atomically: either every action
 * commits or nothing does. Integrates with the canonical lifecycle (session
 * invalidation), leaderboard, tournament StageEntry, and the wallet trigger
 * layer (reversal signal). Manual and automatic enforcement share one path.
 */
export enum EnforcementAction {
  INVALIDATE_SESSION = 'INVALIDATE_SESSION',
  REJECT_COMPLETION = 'REJECT_COMPLETION',
  REMOVE_LEADERBOARD_SCORE = 'REMOVE_LEADERBOARD_SCORE',
  REMOVE_TOURNAMENT_QUALIFICATION = 'REMOVE_TOURNAMENT_QUALIFICATION',
  REMOVE_TOURNAMENT_SCORE = 'REMOVE_TOURNAMENT_SCORE',
  REVOKE_RANKING = 'REVOKE_RANKING',
  PREVENT_WALLET_PAYOUT = 'PREVENT_WALLET_PAYOUT',
  REVERSE_PENDING_PAYOUT = 'REVERSE_PENDING_PAYOUT',
  INVALIDATE_REWARDS = 'INVALIDATE_REWARDS',
  MARK_FOR_REVIEW = 'MARK_FOR_REVIEW',
}

export interface EnforcementRequest {
  userId: string;
  sessionId?: string;
  reason: string;
  actions: EnforcementAction[];
  /** Confirmed = automatic teardown; otherwise queued for manual review only. */
  confirmed: boolean;
  enforcedBy?: string;
}

export interface EnforcementResult {
  enforced: boolean;
  alreadyEnforced: boolean;
  actionsApplied: EnforcementAction[];
}
