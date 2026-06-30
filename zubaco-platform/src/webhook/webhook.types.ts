/**
 * Outbound webhook contracts.
 *
 * The platform is the authority on game scores. After a game session score is
 * validated server-side, the platform notifies the Base Platform via a signed
 * webhook. Delivery is durable (Redis-backed outbox) and retried with
 * exponential backoff. The Base Platform verifies the `x-zubaco-signature`
 * header (HMAC-SHA256 over the raw JSON body) before trusting the payload.
 */

export type WebhookEventType = 'game.result.validated' | 'enforcement.reversal';

/** The validated game-result data carried by a `game.result.validated` event. */
export interface GameResultEventData {
  session_id: string;
  user_id: string;
  game_type: string;
  mode: 'FREE_PLAY' | 'TOURNAMENT';
  /** Authoritative, server-computed score. Never the client claim. */
  score: number;
  max_score: number;
  duration_ms: number | null;
  outcome: string;
  /** Tournament context, when applicable. */
  stage_entry_id?: string | null;
  level?: number | null;
  /** True when anti-cheat/scoring flagged this session for review. */
  flagged: boolean;
  validated: boolean;
  completed_at: string;
}

/** The signed envelope that is delivered to the Base Platform. */
export interface WebhookEnvelope<T = unknown> {
  /** Idempotency key — Base Platform should dedupe on this. */
  id: string;
  type: WebhookEventType;
  /** ISO-8601 creation timestamp. */
  timestamp: string;
  data: T;
}

/** Internal outbox record persisted in Redis between delivery attempts. */
export interface OutboxRecord {
  envelope: WebhookEnvelope;
  signature: string;
  attempt: number;
  next_attempt_at: number;
  last_error?: string;
}
