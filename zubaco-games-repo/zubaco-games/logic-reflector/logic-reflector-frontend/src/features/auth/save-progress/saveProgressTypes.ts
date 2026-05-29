export interface LogicReflectorProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface LogicReflectorSavePayload {
  userId?: string;
  stageId?: string;
  progress: LogicReflectorProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
