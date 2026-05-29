export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface GameLevel {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface Difficulty {
  id: string;
  name: string;
  createdAt: string;
}

// Infinity Loop levels use the same shape as `GameLevel`.
export type InfinityLevel = GameLevel;

export interface BaseGameBoard {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  createdAt?: string;
  created_at?: string;
  level?: {
    id: string;
    name: string;
  };
}

export type GenericGameBoard = BaseGameBoard;

export interface GenericBoardJsonPayload extends JsonObject {
  gridX?: number;
  gridY?: number;
}

export type CreateGenericBoardRequest = GenericBoardJsonPayload & {
  levelId: string;
  name: string;
};

export interface SlidingPuzzleGridSize {
  x: number;
  y: number;
}

export interface SlidingPuzzleShuffle {
  id: string;
  pieces: number[];
  createdAt: string;
}

export interface SlidingPuzzleBoard {
  id: string;
  name: string;
  createdAt: string;
  level: {
    id: string;
    name: string;
  };
  gridSize: SlidingPuzzleGridSize;
}

export interface SlidingPuzzleBoardDetails extends SlidingPuzzleBoard {
  fullImageUrl: string;
  shuffles: SlidingPuzzleShuffle[];
}

export interface CreateSlidingPuzzleBoardRequest {
  levelId: string;
  name: string;
  gridSize: SlidingPuzzleGridSize;
  fileUrl: string;
  shuffles: number[][];
}

export interface UpdateSlidingPuzzleBoardRequest {
  boardId: string;
  name: string;
  gridSize: SlidingPuzzleGridSize;
  fileUrl: string;
  shuffles: number[][];
}

export interface InfinityBoardDetails {
  id: string;
  name: string;
  gridSize: { x: number; y: number };
  grid: number[][];
  timeLimit: number;
  color: string;
  level: { id: string; name: string };
  createdAt?: string;
}

export function formatSlidingPuzzleBoardDetails(data: SlidingPuzzleBoardDetails): unknown {
  if (!data) return null;
  return {
    levelId: data.level?.id || "",
    name: data.name,
    gridSize: data.gridSize,
    fileUrl: data.fullImageUrl,
    shuffles: (data.shuffles || []).map((s) => s.pieces),
  };
}
