export interface MemoryCardProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface MemoryCardSavePayload {
  userId?: string;
  stageId?: string;
  progress: MemoryCardProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
