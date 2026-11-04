/**
 * Canonical 15-Stage Tournament Lifecycle State Machine (Module 5.2).
 *
 * Sequence:
 * DRAFT -> REGISTRATION_OPEN -> REGISTRATION_CLOSED ->
 * STAGE_1_LIVE -> STAGE_1_TALLY ->
 * STAGE_2_LIVE -> STAGE_2_TALLY ->
 * STAGE_3_LIVE -> STAGE_3_TALLY ->
 * STAGE_4_LIVE -> STAGE_4_TALLY ->
 * STAGE_5_LIVE -> STAGE_5_TALLY ->
 * PRIZE_CALCULATION -> PRIZE_DISTRIBUTED -> ARCHIVED.
 *
 * Non-terminal states can transition to CANCELLED.
 */

export enum TournamentLifecycleState {
  DRAFT = 'DRAFT',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  STAGE_1_LIVE = 'STAGE_1_LIVE',
  STAGE_1_TALLY = 'STAGE_1_TALLY',
  STAGE_2_LIVE = 'STAGE_2_LIVE',
  STAGE_2_TALLY = 'STAGE_2_TALLY',
  STAGE_3_LIVE = 'STAGE_3_LIVE',
  STAGE_3_TALLY = 'STAGE_3_TALLY',
  STAGE_4_LIVE = 'STAGE_4_LIVE',
  STAGE_4_TALLY = 'STAGE_4_TALLY',
  STAGE_5_LIVE = 'STAGE_5_LIVE',
  STAGE_5_TALLY = 'STAGE_5_TALLY',
  PRIZE_CALCULATION = 'PRIZE_CALCULATION',
  PRIZE_DISTRIBUTED = 'PRIZE_DISTRIBUTED',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED',
}

export const MANDATORY_INTERMISSION_REST_SECONDS = 60;

export const LIFECYCLE_ORDERED_SEQUENCE: ReadonlyArray<TournamentLifecycleState> = [
  TournamentLifecycleState.DRAFT,
  TournamentLifecycleState.REGISTRATION_OPEN,
  TournamentLifecycleState.REGISTRATION_CLOSED,
  TournamentLifecycleState.STAGE_1_LIVE,
  TournamentLifecycleState.STAGE_1_TALLY,
  TournamentLifecycleState.STAGE_2_LIVE,
  TournamentLifecycleState.STAGE_2_TALLY,
  TournamentLifecycleState.STAGE_3_LIVE,
  TournamentLifecycleState.STAGE_3_TALLY,
  TournamentLifecycleState.STAGE_4_LIVE,
  TournamentLifecycleState.STAGE_4_TALLY,
  TournamentLifecycleState.STAGE_5_LIVE,
  TournamentLifecycleState.STAGE_5_TALLY,
  TournamentLifecycleState.PRIZE_CALCULATION,
  TournamentLifecycleState.PRIZE_DISTRIBUTED,
  TournamentLifecycleState.ARCHIVED,
];

const LIFECYCLE_TRANSITIONS: Record<TournamentLifecycleState, ReadonlySet<TournamentLifecycleState>> = {
  [TournamentLifecycleState.DRAFT]: new Set([
    TournamentLifecycleState.REGISTRATION_OPEN,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.REGISTRATION_OPEN]: new Set([
    TournamentLifecycleState.REGISTRATION_CLOSED,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.REGISTRATION_CLOSED]: new Set([
    TournamentLifecycleState.STAGE_1_LIVE,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_1_LIVE]: new Set([
    TournamentLifecycleState.STAGE_1_TALLY,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_1_TALLY]: new Set([
    TournamentLifecycleState.STAGE_2_LIVE,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_2_LIVE]: new Set([
    TournamentLifecycleState.STAGE_2_TALLY,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_2_TALLY]: new Set([
    TournamentLifecycleState.STAGE_3_LIVE,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_3_LIVE]: new Set([
    TournamentLifecycleState.STAGE_3_TALLY,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_3_TALLY]: new Set([
    TournamentLifecycleState.STAGE_4_LIVE,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_4_LIVE]: new Set([
    TournamentLifecycleState.STAGE_4_TALLY,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_4_TALLY]: new Set([
    TournamentLifecycleState.STAGE_5_LIVE,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_5_LIVE]: new Set([
    TournamentLifecycleState.STAGE_5_TALLY,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.STAGE_5_TALLY]: new Set([
    TournamentLifecycleState.PRIZE_CALCULATION,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.PRIZE_CALCULATION]: new Set([
    TournamentLifecycleState.PRIZE_DISTRIBUTED,
    TournamentLifecycleState.CANCELLED,
  ]),
  [TournamentLifecycleState.PRIZE_DISTRIBUTED]: new Set([
    TournamentLifecycleState.ARCHIVED,
  ]),
  [TournamentLifecycleState.ARCHIVED]: new Set(),
  [TournamentLifecycleState.CANCELLED]: new Set(),
};

export function canTransitionLifecycle(
  from: TournamentLifecycleState,
  to: TournamentLifecycleState,
): boolean {
  return LIFECYCLE_TRANSITIONS[from]?.has(to) ?? false;
}

export function assertLifecycleTransition(
  from: TournamentLifecycleState,
  to: TournamentLifecycleState,
): void {
  if (!canTransitionLifecycle(from, to)) {
    throw new Error(`Illegal tournament lifecycle transition: ${from} -> ${to}`);
  }
}

export function getNextLifecycleState(
  current: TournamentLifecycleState,
): TournamentLifecycleState | null {
  const index = LIFECYCLE_ORDERED_SEQUENCE.indexOf(current);
  if (index === -1 || index === LIFECYCLE_ORDERED_SEQUENCE.length - 1) {
    return null;
  }
  return LIFECYCLE_ORDERED_SEQUENCE[index + 1];
}

export function isStageLiveState(state: TournamentLifecycleState): boolean {
  return (
    state === TournamentLifecycleState.STAGE_1_LIVE ||
    state === TournamentLifecycleState.STAGE_2_LIVE ||
    state === TournamentLifecycleState.STAGE_3_LIVE ||
    state === TournamentLifecycleState.STAGE_4_LIVE ||
    state === TournamentLifecycleState.STAGE_5_LIVE
  );
}

export function isStageTallyState(state: TournamentLifecycleState): boolean {
  return (
    state === TournamentLifecycleState.STAGE_1_TALLY ||
    state === TournamentLifecycleState.STAGE_2_TALLY ||
    state === TournamentLifecycleState.STAGE_3_TALLY ||
    state === TournamentLifecycleState.STAGE_4_TALLY ||
    state === TournamentLifecycleState.STAGE_5_TALLY
  );
}

export function getStageNumberFromState(state: TournamentLifecycleState): number | null {
  switch (state) {
    case TournamentLifecycleState.STAGE_1_LIVE:
    case TournamentLifecycleState.STAGE_1_TALLY:
      return 1;
    case TournamentLifecycleState.STAGE_2_LIVE:
    case TournamentLifecycleState.STAGE_2_TALLY:
      return 2;
    case TournamentLifecycleState.STAGE_3_LIVE:
    case TournamentLifecycleState.STAGE_3_TALLY:
      return 3;
    case TournamentLifecycleState.STAGE_4_LIVE:
    case TournamentLifecycleState.STAGE_4_TALLY:
      return 4;
    case TournamentLifecycleState.STAGE_5_LIVE:
    case TournamentLifecycleState.STAGE_5_TALLY:
      return 5;
    default:
      return null;
  }
}
