export interface MemoryGroupsProgressEntry {
  levelIndex: number;
  score: number;
  stars: number;
  completedAt: number;
  timeTakenMs: number;
  movesUsed: number;
  hintsUsed: number;
}

export interface MemoryGroupsSavePayload {
  userId?: string;
  stageId?: string;
  progress: MemoryGroupsProgressEntry[];
  lastPlayedLevel: number;
  totalScore: number;
  savedAt: number;
}
