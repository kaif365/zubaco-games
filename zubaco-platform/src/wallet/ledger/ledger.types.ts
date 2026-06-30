/**
 * Authoritative wallet ledger (WALLET-001 / WALLET-002 foundation).
 *
 * One transactional financial pipeline for every money movement. Each
 * operation is idempotent (idempotencyKey + Redis lock), atomic (single Prisma
 * $transaction over the row-locked wallet), and carries a complete immutable
 * audit trail (source, destination, reason, verification/tournament/enforcement
 * references). Authoritative-by-construction: payouts/rewards only execute when
 * the caller supplies the required references; there is no client-triggered path.
 */
export enum FinancialOperation {
  REWARD_CREDIT = 'REWARD_CREDIT',
  TOURNAMENT_PAYOUT = 'TOURNAMENT_PAYOUT',
  PENDING_PAYOUT = 'PENDING_PAYOUT',
  PAYOUT_SETTLEMENT = 'PAYOUT_SETTLEMENT',
  PAYOUT_REVERSAL = 'PAYOUT_REVERSAL',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

/** Which money bucket the operation touches. */
export type WalletBucket = 'cash' | 'bonus';

export interface LedgerRequest {
  userId: string;
  operation: FinancialOperation;
  amount: number;
  /** Stable dedup key — same key = same operation; retries are safe. */
  idempotencyKey: string;
  reason: string;
  bucket?: WalletBucket;
  source?: string;
  destination?: string;
  verificationRef?: string;
  tournamentRef?: string;
  enforcementRef?: string;
}

export interface LedgerResult {
  transactionId: string;
  applied: boolean;
  duplicate: boolean;
  balanceAfter: number;
}
