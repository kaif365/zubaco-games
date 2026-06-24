import type { BaseGameBoard, JsonObject, JsonValue } from "@/types/pool";
import { fail, ok, type ValidationResult } from "@/lib/validation";

export interface MazeTemplate extends BaseGameBoard {
  levelId: string;
  grid: number[][];
  rows: number;
  cols: number;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  level?: {
    id: string;
    name: string;
  };
}

export interface MazeTemplateCreateRequest {
  levelId: string;
  grid: number[][];
  rows: number;
  cols: number;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface MazeTemplateGenerateRequest {
  levelId: string;
  rows: number;
  cols: number;
}

export interface MazeTemplateGenerateResponse extends MazeTemplateCreateRequest {
  seed?: string;
  solvable?: boolean;
  pathLength?: number;
}

export interface MazeTemplateJsonPayload extends JsonObject {
  grid?: JsonValue;
  rows?: JsonValue;
  cols?: JsonValue;
  startRow?: JsonValue;
  startCol?: JsonValue;
  endRow?: JsonValue;
  endCol?: JsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(
  value: JsonValue,
): value is Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isBinaryGrid(value: unknown): value is number[][] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length > 0 &&
      row.every((cell) => cell === 0 || cell === 1),
  );
}

function extractMazeTemplatePayload(
  value: unknown,
): MazeTemplateCreateRequest | null {
  if (!isRecord(value)) return null;

  const {
    levelId,
    grid,
    rows,
    cols,
    startRow,
    startCol,
    endRow,
    endCol,
  } = value;

  if (typeof levelId !== "string" || !levelId.trim()) return null;
  if (!isBinaryGrid(grid)) return null;
  if (
    !isFiniteInteger(rows) ||
    !isFiniteInteger(cols) ||
    !isFiniteInteger(startRow) ||
    !isFiniteInteger(startCol) ||
    !isFiniteInteger(endRow) ||
    !isFiniteInteger(endCol)
  ) {
    return null;
  }

  if (grid.length !== rows || grid.some((row) => row.length !== cols)) {
    return null;
  }

  return {
    levelId,
    grid,
    rows,
    cols,
    startRow,
    startCol,
    endRow,
    endCol,
  };
}

export function deriveMazeTemplateName(template: {
  id: string;
  rows: number;
  cols: number;
  level?: { name?: string };
}): string {
  const levelName = template.level?.name?.trim() || "Maze";
  return `${levelName} ${template.rows}x${template.cols} #${template.id.slice(0, 8)}`;
}

export function parseMazeTemplateBoard(
  board: unknown,
): ValidationResult<MazeTemplate> {
  const payload = extractMazeTemplatePayload(board);
  if (!payload || !isRecord(board)) {
    return fail("Invalid Maze template response.");
  }

  const id = board.id;
  if (typeof id !== "string" || !id.trim()) {
    return fail("Missing Maze template ID.");
  }

  const level = isRecord(board.level)
    ? {
        id: typeof board.level.id === "string" ? board.level.id : payload.levelId,
        name:
          typeof board.level.name === "string" && board.level.name.trim()
            ? board.level.name
            : "Maze",
      }
    : undefined;

  const template: MazeTemplate = {
    ...payload,
    id,
    level,
    name: deriveMazeTemplateName({
      id,
      rows: payload.rows,
      cols: payload.cols,
      level,
    }),
    gridX: payload.cols,
    gridY: payload.rows,
    createdAt:
      typeof board.createdAt === "string"
        ? board.createdAt
        : typeof board.created_at === "string"
          ? board.created_at
          : undefined,
    created_at:
      typeof board.created_at === "string"
        ? board.created_at
        : typeof board.createdAt === "string"
          ? board.createdAt
          : undefined,
  };

  return ok(template);
}

export function parseMazeCreatePayload(
  payload: unknown,
): ValidationResult<MazeTemplateCreateRequest> {
  const parsed = extractMazeTemplatePayload(payload);
  return parsed ? ok(parsed) : fail("Invalid Maze create payload.");
}

export function buildMazeCreatePayloadFromJsonResult(input: {
  levelId: string;
  json: JsonValue;
}): ValidationResult<MazeTemplateCreateRequest> {
  if (!isJsonObject(input.json)) {
    return fail("Maze JSON must be an object (not an array).");
  }

  const parsed = extractMazeTemplatePayload({
    ...input.json,
    levelId: input.levelId,
  });

  return parsed
    ? ok(parsed)
    : fail("This JSON doesn't match the expected Maze format.");
}

export function formatMazeTemplateDetails(
  template: MazeTemplateCreateRequest,
): MazeTemplateCreateRequest {
  return {
    levelId: template.levelId,
    grid: template.grid,
    rows: template.rows,
    cols: template.cols,
    startRow: template.startRow,
    startCol: template.startCol,
    endRow: template.endRow,
    endCol: template.endCol,
  };
}

export function toMazeCreatePayload(
  template: MazeTemplateGenerateResponse,
): MazeTemplateCreateRequest {
  return {
    levelId: template.levelId,
    grid: template.grid,
    rows: template.rows,
    cols: template.cols,
    startRow: template.startRow,
    startCol: template.startCol,
    endRow: template.endRow,
    endCol: template.endCol,
  };
}
