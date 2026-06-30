/**
 * Canonical game-session lifecycle (GAME-001 foundation).
 *
 * Single authoritative state machine that every engine (Restate, direct
 * service, legacy) must transition through. There is exactly one terminal
 * completion path and no client-selected transitions.
 *
 *   CREATED -> INITIALIZED -> STARTED -> ACTIVE -> RESULT_PROCESSING
 *           -> COMPLETED | EXPIRED | CANCELLED
 *
 * Maps onto the persisted SessionOutcome: COMPLETED/DISQUALIFIED, TIMED_OUT
 * (EXPIRED), ABANDONED (CANCELLED). Non-terminal states are tracked in
 * GameSession.metadata._lifecycle so the schema stays unchanged.
 */
export enum SessionState {
  CREATED = 'CREATED',
  INITIALIZED = 'INITIALIZED',
  STARTED = 'STARTED',
  ACTIVE = 'ACTIVE',
  RESULT_PROCESSING = 'RESULT_PROCESSING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const TERMINAL_STATES: ReadonlySet<SessionState> = new Set([
  SessionState.COMPLETED,
  SessionState.EXPIRED,
  SessionState.CANCELLED,
]);

const TRANSITIONS: Record<SessionState, ReadonlySet<SessionState>> = {
  [SessionState.CREATED]: new Set([SessionState.INITIALIZED, SessionState.CANCELLED]),
  [SessionState.INITIALIZED]: new Set([SessionState.STARTED, SessionState.CANCELLED, SessionState.EXPIRED]),
  [SessionState.STARTED]: new Set([SessionState.ACTIVE, SessionState.CANCELLED, SessionState.EXPIRED]),
  [SessionState.ACTIVE]: new Set([SessionState.RESULT_PROCESSING, SessionState.EXPIRED, SessionState.CANCELLED]),
  [SessionState.RESULT_PROCESSING]: new Set([SessionState.COMPLETED, SessionState.EXPIRED]),
  [SessionState.COMPLETED]: new Set(),
  [SessionState.EXPIRED]: new Set(),
  [SessionState.CANCELLED]: new Set(),
};

export function isTerminal(state: SessionState): boolean {
  return TERMINAL_STATES.has(state);
}

export function canTransition(from: SessionState, to: SessionState): boolean {
  return TRANSITIONS[from]?.has(to) ?? false;
}

/** Throws unless the requested transition is legal. The single guard all engines use. */
export function assertTransition(from: SessionState, to: SessionState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal session transition ${from} -> ${to}`);
  }
}

export function outcomeForTerminal(state: SessionState): 'COMPLETED' | 'TIMED_OUT' | 'ABANDONED' {
  switch (state) {
    case SessionState.COMPLETED:
      return 'COMPLETED';
    case SessionState.EXPIRED:
      return 'TIMED_OUT';
    case SessionState.CANCELLED:
      return 'ABANDONED';
    default:
      throw new Error(`State ${state} is not terminal`);
  }
}
