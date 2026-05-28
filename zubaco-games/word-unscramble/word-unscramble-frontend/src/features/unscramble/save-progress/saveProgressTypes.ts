export interface WordUnscrambleProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface WordUnscrambleSavePayload {
  userId?: string;
  stageId?: string;
  progress: WordUnscrambleProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
