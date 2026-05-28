/** One saved move/color line; `moveId` + `timeStamp` are per-path for dedupe. */
export interface SaveProgressPathPayload {
  /** Color code string, e.g. `pink`, `cyan`, `amber` (same as board node `colorId`). */
  color: string;
  path: Array<{ row: number; col: number }>;
  completed: boolean;
  moveId: string;
  timeStamp: string;
}

export interface SaveProgressBoardPayload {
  sessionBoardId: string;
  version: number;
  paths: SaveProgressPathPayload[];
}

export interface SaveProgressBody {
  sessionId: string;
  board: SaveProgressBoardPayload;
}

export interface CompleteBoardPathPayload {
  moveId: string;
  timeStamp: string;
  color: string;
  path: Array<{ row: number; col: number }>;
}

export interface CompleteBoardBody {
  sessionId: string;
  board: {
    sessionBoardId: string;
    version: number;
    paths: CompleteBoardPathPayload[];
  };
}

export interface SaveProgressEnvelope {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: {
    version?: number;
    board?: {
      version?: number;
    };
    completed?: boolean;
  };
}
