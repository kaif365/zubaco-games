import { TournamentPhase } from './tournament-state';

/** Result of advancing a stage through the single authoritative pipeline. */
export interface StageAdvanceResult {
  seasonStageId: string;
  alreadyAdvanced: boolean;
  qualified: number;
  eliminated: number;
  survived: number;
  pools: number;
  nextStageOpened: boolean;
  seasonCompleted: boolean;
}

/** A winner candidate after banned/disqualified participants are excluded. */
export interface RewardEligibility {
  seasonEntryId: string;
  userId: string;
  rank: number;
  totalScore: number;
  totalTimeMs: number;
}

export interface SeasonProgressionState {
  seasonId: string;
  phase: TournamentPhase;
  currentStageNumber: number | null;
  cancelled: boolean;
}
