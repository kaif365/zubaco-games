export type MemoryCardContentType = "image" | "symbol";

export interface MemoryCardImageContentConfig {
  type: "image";
  assetKeys: string[];
}

export interface MemoryCardSymbolContentConfig {
  type: "symbol";
  items: string[];
}

export type MemoryCardContentConfig =
  | MemoryCardImageContentConfig
  | MemoryCardSymbolContentConfig;

export interface MemoryCardMatchingLevel {
  id: string;
  name: string;
  difficultyId: string;
  difficulty?: {
    id: string;
    name: string;
  };
  gridRows: number;
  gridColumns: number;
  cardContentType: MemoryCardContentType;
  previewDurationSeconds: number;
  mismatchDisplayDurationSeconds: number;
  contentConfig: MemoryCardContentConfig;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateMemoryCardMatchingLevelPayload {
  name: string;
  difficultyId: string;
  gridRows: number;
  gridColumns: number;
  cardContentType: MemoryCardContentType;
  previewDurationSeconds: number;
  mismatchDisplayDurationSeconds: number;
  contentConfig: MemoryCardContentConfig;
}

/** Body for `PUT /v1/levels` — same as create plus `levelId` (MCM backend contract). */
export type UpdateMemoryCardMatchingLevelPayload =
  CreateMemoryCardMatchingLevelPayload & {
    levelId: string;
  };

export interface MemoryCardMatchingLevelsParams {
  gridRows?: number;
  gridColumns?: number;
  cardContentType?: MemoryCardContentType;
  difficultyId?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export function isImageContentConfig(
  c: MemoryCardContentConfig | undefined,
): c is MemoryCardImageContentConfig {
  return c?.type === "image";
}

export function isSymbolContentConfig(
  c: MemoryCardContentConfig | undefined,
): c is MemoryCardSymbolContentConfig {
  return c?.type === "symbol";
}

export interface MemoryCardMatchingStageConfigLevel {
  id?: string;
  difficultyId: string;
  boardCount: number;
  order?: number;
  difficulty?: {
    id: string;
    name: string;
    createdAt: string;
  };
}

export interface MemoryCardMatchingStageConfig {
  id: string;
  stageId: string;
  timeLimit: number;
  enableDemo: boolean;
  levels: MemoryCardMatchingStageConfigLevel[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMemoryCardMatchingStageConfigPayload {
  id?: string;
  stageId: string;
  timeLimit: number;
  enableDemo: boolean;
  levels: Array<{
    id?: string;
    difficultyId: string;
    boardCount: number;
  }>;
  demoLevels?: Array<{
    difficultyId: string;
    boardCount: number;
  }>;
}
