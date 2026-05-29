export interface ReflexEnduranceProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface ReflexEnduranceSavePayload {
  userId?: string;
  stageId?: string;
  progress: ReflexEnduranceProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
