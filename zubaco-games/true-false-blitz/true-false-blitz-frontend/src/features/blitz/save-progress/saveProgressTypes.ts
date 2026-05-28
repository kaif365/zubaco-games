export interface TrueFalseBlitzProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface TrueFalseBlitzSavePayload {
  userId?: string;
  stageId?: string;
  progress: TrueFalseBlitzProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
