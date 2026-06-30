import { SeasonStatus, StageStatus, EntryStatus } from '.prisma/client';

/**
 * Canonical tournament progression state machine (TOURN-003 foundation).
 *
 * One authoritative phase model spanning creation → registration →
 * participant validation → match generation → stage progression →
 * qualification → elimination → completion / cancellation → reward
 * eligibility. Every legacy flow must transition through these guards; there
 * is no client-triggered progression and no parallel completion logic.
 */
export enum TournamentPhase {
  CREATED = 'CREATED',
  REGISTRATION = 'REGISTRATION',
  PARTICIPANT_VALIDATION = 'PARTICIPANT_VALIDATION',
  MATCH_GENERATION = 'MATCH_GENERATION',
  STAGE_PROGRESSION = 'STAGE_PROGRESSION',
  QUALIFICATION = 'QUALIFICATION',
  ELIMINATION = 'ELIMINATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REWARD_ELIGIBILITY = 'REWARD_ELIGIBILITY',
}

export const TOURNAMENT_TERMINAL: ReadonlySet<TournamentPhase> = new Set([
  TournamentPhase.REWARD_ELIGIBILITY,
  TournamentPhase.CANCELLED,
]);

const PHASE_TRANSITIONS: Record<TournamentPhase, ReadonlySet<TournamentPhase>> = {
  [TournamentPhase.CREATED]: new Set([TournamentPhase.REGISTRATION, TournamentPhase.CANCELLED]),
  [TournamentPhase.REGISTRATION]: new Set([TournamentPhase.PARTICIPANT_VALIDATION, TournamentPhase.CANCELLED]),
  [TournamentPhase.PARTICIPANT_VALIDATION]: new Set([TournamentPhase.MATCH_GENERATION, TournamentPhase.CANCELLED]),
  [TournamentPhase.MATCH_GENERATION]: new Set([TournamentPhase.STAGE_PROGRESSION, TournamentPhase.CANCELLED]),
  [TournamentPhase.STAGE_PROGRESSION]: new Set([TournamentPhase.QUALIFICATION, TournamentPhase.CANCELLED]),
  [TournamentPhase.QUALIFICATION]: new Set([TournamentPhase.ELIMINATION, TournamentPhase.CANCELLED]),
  [TournamentPhase.ELIMINATION]: new Set([
    TournamentPhase.STAGE_PROGRESSION,
    TournamentPhase.COMPLETED,
    TournamentPhase.CANCELLED,
  ]),
  [TournamentPhase.COMPLETED]: new Set([TournamentPhase.REWARD_ELIGIBILITY]),
  [TournamentPhase.REWARD_ELIGIBILITY]: new Set(),
  [TournamentPhase.CANCELLED]: new Set(),
};

export function assertPhaseTransition(from: TournamentPhase, to: TournamentPhase): void {
  if (!PHASE_TRANSITIONS[from].has(to)) {
    throw new Error(`Illegal tournament transition ${from} -> ${to}`);
  }
}

/** Persisted SeasonStatus a phase corresponds to. */
export function phaseToSeasonStatus(phase: TournamentPhase): SeasonStatus {
  switch (phase) {
    case TournamentPhase.CREATED:
      return 'UPCOMING';
    case TournamentPhase.REGISTRATION:
      return 'REGISTRATION';
    case TournamentPhase.CANCELLED:
      return 'CANCELLED';
    case TournamentPhase.COMPLETED:
    case TournamentPhase.REWARD_ELIGIBILITY:
      return 'COMPLETED';
    default:
      return 'ACTIVE';
  }
}

const STAGE_TRANSITIONS: Record<StageStatus, ReadonlySet<StageStatus>> = {
  LOCKED: new Set(['OPEN']),
  OPEN: new Set(['CLOSED']),
  CLOSED: new Set(['ELIMINATED']),
  ELIMINATED: new Set(),
};

export function assertStageTransition(from: StageStatus, to: StageStatus): void {
  if (!STAGE_TRANSITIONS[from].has(to)) {
    throw new Error(`Illegal stage transition ${from} -> ${to}`);
  }
}

const ENTRY_TRANSITIONS: Record<EntryStatus, ReadonlySet<EntryStatus>> = {
  ACTIVE: new Set(['ELIMINATED', 'WINNER', 'WITHDRAWN']),
  ELIMINATED: new Set(),
  WINNER: new Set(),
  WITHDRAWN: new Set(),
};

export function assertEntryTransition(from: EntryStatus, to: EntryStatus): void {
  if (!ENTRY_TRANSITIONS[from].has(to)) {
    throw new Error(`Illegal entry transition ${from} -> ${to}`);
  }
}
