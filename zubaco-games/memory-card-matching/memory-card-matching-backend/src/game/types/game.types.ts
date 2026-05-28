export type CardContentType = "symbol" | "image" | "color" | "wordImage";
export type GameResult = "win" | "lose";

export interface GameConfigResponse {
  gameTimeLimitSeconds: number;
  totalLevels: number;
  enableDemo: boolean;
}

export interface SessionTimingResponse {
  startTime: string;
  endTime: string;
}

export interface LevelCard {
  id: string;
  pairId: string;
  contentType: CardContentType;
  content: string;
  imageUrl: string | null;
  isTurned: boolean;
}

export interface LevelData {
  id: string;
  levelIndex: number;
  gridRows: number;
  gridColumns: number;
  cardContentType: CardContentType;
  previewDurationSeconds: number;
  mismatchDisplayDurationSeconds: number;
  cards: LevelCard[];
}

export interface CurrentSessionResponse {
  sessionId: string;
  currentLevelIndex: number;
  timeRemaining: number;
  currentLevel: LevelData;
  startTime: string;
  endTime: string;
}

export interface StartGameResponse extends SessionTimingResponse {
  sessionId: string;
  firstLevel: LevelData;
}

export interface NextLevelResponse extends SessionTimingResponse {
  level: LevelData;
}

export interface SaveProgressResponse {
  accepted: number;
  startedAt: string;
  expiryAt: string;
}

export interface CompleteBoardResponse {
  gameOver: boolean;
}

export interface GameOverResponse {
  finalScore: number;
  roundsCompleted: number;
  totalRounds: number;
}

export interface MatchedPairProgressEntry {
  pairId: string;
  timestamp: string;
}

export interface SessionMatchedPairRecord extends MatchedPairProgressEntry {
  timestampMs: number;
}

export interface SessionMoveRecord {
  moveIndex: number;
  levelIndex: number;
  clientMoveId: string;
  cardId: string;
  pairId: string;
  clickedAt: string;
  clickedAtMs: number;
  timeRemaining: number;
  outcome: "FIRST_FLIP" | "MATCH" | "MISMATCH" | "IGNORED";
  matchedPairId: string | null;
}

export interface SessionPendingFlip {
  clientMoveId: string;
  cardId: string;
  pairId: string;
  clickedAt: string;
  clickedAtMs: number;
}

export interface SessionLevelSnapshot {
  gameSessionLevelId: string;
  levelIndex: number;
  sourceLevelId: string;
  data: LevelData;
}

export interface ActiveGameSessionState {
  sessionId: string;
  ownerKey: string;
  stageId: string;
  status: string;
  gameTimeLimitSeconds: number;
  enableDemo: boolean;
  gameSessionSnapshotId: string;
  gameSessionStageConfigSnapshotId: string;
  currentLevelIndex: number;
  timeRemaining: number;
  startTimeMs: number;
  endTimeMs: number;
  matchedPairsByLevel: SessionMatchedPairRecord[][];
  processedMoveIdsByLevel: string[][];
  pendingFlipsByLevel: Array<SessionPendingFlip | null>;
  completedLevelIndices: number[];
  completedAtMsByLevel: Array<number | null>;
  levels: SessionLevelSnapshot[];
  moveHistory: SessionMoveRecord[];
  createdAt: string;
  updatedAt: string;
}
