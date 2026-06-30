/**
 * Unified platform event contract (NOTIF-001/002/003 foundation).
 *
 * Every authoritative platform event is published ONCE through the event bus
 * and consumed reliably by subscribers (in-app, webhook, future email/SMS/push)
 * with at-least-once + idempotent delivery, retry, DLQ and versioning. Events
 * are emitted only after the originating authoritative transaction commits;
 * there are no direct service-to-service notification calls for these events.
 */
export enum PlatformEventType {
  GAME_COMPLETED = 'game.completed',
  VERIFICATION_PASSED = 'verification.passed',
  VERIFICATION_FAILED = 'verification.failed',
  TOURNAMENT_PROGRESSED = 'tournament.progressed',
  TOURNAMENT_COMPLETED = 'tournament.completed',
  REWARD_ELIGIBLE = 'reward.eligible',
  WALLET_CREDITED = 'wallet.credited',
  PAYOUT_SETTLED = 'payout.settled',
  PAYOUT_REVERSED = 'payout.reversed',
  ANTI_CHEAT_ENFORCED = 'anticheat.enforced',
  ACCOUNT_REVIEWED = 'account.reviewed',
  ACCOUNT_RESTORED = 'account.restored',
  LEADERBOARD_UPDATED = 'leaderboard.updated',
  DEPOSIT_FAILED = 'deposit.failed',
  DEPOSIT_CANCELLED = 'deposit.cancelled',
}

/** Current schema version for every published event payload. */
export const EVENT_SCHEMA_VERSION = 1;

export interface PlatformEvent<T = unknown> {
  /** Idempotency key — subscribers dedupe on this. */
  id: string;
  type: PlatformEventType;
  version: number;
  /** ISO-8601 emit time (after transaction commit). */
  occurredAt: string;
  userId?: string;
  data: T;
}

export type SubscriberStatus = 'delivered' | 'failed';

/** A single delivery target. Adapters implement this for each channel. */
export interface EventSubscriber {
  readonly name: string;
  /** Returns true on success; throw or false → retried, eventually dead-lettered. */
  handle(event: PlatformEvent): Promise<boolean>;
}

export interface EventDeliveryRecord {
  event: PlatformEvent;
  subscriber: string;
  attempt: number;
  nextAttemptAt: number;
}
