import { fail, ok, type ValidationResult } from "@/lib/validation";
import {
  buildArrowsCreatePayloadFromJsonResult,
  formatArrowBoardDetails,
  type ArrowBoardDetails,
} from "@/types/games/arrows";
import {
  buildBlockFillCreatePayloadFromJsonResult,
  formatBlockFillBoardDetails,
  parseBlockFillBoard,
  parseBlockFillCreatePayload,
  type BlockFillBoardDetails,
} from "@/types/games/block-fill";
import {
  buildMazeCreatePayloadFromJsonResult,
  formatMazeTemplateDetails,
  parseMazeCreatePayload,
  parseMazeTemplateBoard,
  type MazeTemplate,
  type MazeTemplateCreateRequest,
} from "@/types/games/maze";
import {
  buildSpotTheDifferenceCreatePayloadFromJsonResult,
  formatSpotTheDifferenceBoardDetails,
  type SpotTheDifferenceBoardDetails,
} from "@/types/games/spot-the-difference";
import type {
  InfinityBoardDetails,
  JsonValue,
  SlidingPuzzleBoardDetails,
} from "@/types/pool";
import { formatSlidingPuzzleBoardDetails } from "@/types/pool";
import { slugifyGameName } from "@/utils/slugify";

export interface CreatePayloadInput {
  levelId: string;
  name: string;
  json: JsonValue;
}

export interface GamePoolAdapter {
  buildCreatePayloadFromJson: (
    input: CreatePayloadInput,
  ) => ValidationResult<unknown>;
  parseCreatePayload: (payload: unknown) => ValidationResult<unknown>;
  parseBoard: (board: unknown) => ValidationResult<unknown>;
  formatBoardDetails?: (details: unknown) => unknown;
  invalidJsonMessage: string;
}

function isJsonObject(
  value: JsonValue,
): value is Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseBaseBoard(board: unknown): Record<string, unknown> | null {
  if (!isRecord(board)) return null;
  if (!isString(board.id) || !board.id.trim()) return null;
  if (!isString(board.name) || !board.name.trim()) return null;

  // Some games (e.g. Arrows) return `{ gridSize: { x, y } }` instead of `gridX/gridY`.
  // Normalize to `gridX/gridY` since the admin tables/types expect these fields.
  if (isNumber(board.gridX) && isNumber(board.gridY)) return board;

  const gridSize = board.gridSize;
  if (!isRecord(gridSize)) return null;
  const x = (gridSize as Record<string, unknown>).x;
  const y = (gridSize as Record<string, unknown>).y;
  if (!isNumber(x) || !isNumber(y)) return null;

  return {
    ...board,
    gridX: x,
    gridY: y,
  };
}

function parseDefaultCreatePayload(
  payload: unknown,
): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (!isString(payload.levelId) || !payload.levelId.trim()) return null;
  if (!isString(payload.name) || !payload.name.trim()) return null;
  return payload;
}

const DEFAULT_POOL_ADAPTER: GamePoolAdapter = {
  invalidJsonMessage: "This JSON must be an object (not an array).",
  buildCreatePayloadFromJson: (input) => {
    if (!isJsonObject(input.json)) {
      return fail("This JSON must be an object (not an array).");
    }
    const { levelId: _ignored, ...rest } = input.json as Record<
      string,
      JsonValue | undefined
    >;
    return ok({
      levelId: input.levelId,
      name: input.name,
      ...rest,
    });
  },
  parseCreatePayload: (payload) => {
    const parsed = parseDefaultCreatePayload(payload);
    return parsed ? ok(parsed) : fail("Invalid create payload.");
  },
  parseBoard: (board) => {
    const parsed = parseBaseBoard(board);
    return parsed ? ok(parsed) : fail("Invalid board response.");
  },
};

function parseArrowsCreatePayload(
  payload: unknown,
): Record<string, unknown> | null {
  if (!parseDefaultCreatePayload(payload)) return null;
  const record = payload as Record<string, unknown>;

  const gridSize = record.gridSize;
  if (!isRecord(gridSize)) return null;
  if (!isNumber(gridSize.x) || !isNumber(gridSize.y)) return null;

  const arrowsValue = record.arrows;
  if (!Array.isArray(arrowsValue)) return null;

  for (const arrow of arrowsValue) {
    if (!isRecord(arrow)) return null;
    if (!Array.isArray(arrow.waypoints)) return null;
    if (!isString(arrow.headDirection) || !arrow.headDirection.trim())
      return null;
    if (!isNumber(arrow.color)) return null;

    for (const wp of arrow.waypoints) {
      if (!isRecord(wp)) return null;
      if (!isNumber(wp.x) || !isNumber(wp.y)) return null;
    }
  }

  return record;
}

function parseArrowsBoard(board: unknown): Record<string, unknown> | null {
  const base = parseBaseBoard(board);
  if (!base) return null;
  if (!isNumber((base as Record<string, unknown>).arrowCount)) return null;
  return base;
}

const ARROWS_POOL_ADAPTER: GamePoolAdapter = {
  invalidJsonMessage: "This JSON doesn't match the expected Arrows format.",
  buildCreatePayloadFromJson: (input) =>
    buildArrowsCreatePayloadFromJsonResult(input),
  parseCreatePayload: (payload) => {
    const parsed = parseArrowsCreatePayload(payload);
    return parsed ? ok(parsed) : fail("Invalid Arrows create payload.");
  },
  parseBoard: (board) => {
    const parsed = parseArrowsBoard(board);
    return parsed ? ok(parsed) : fail("Invalid Arrows board response.");
  },
  formatBoardDetails: (details) =>
    formatArrowBoardDetails(details as ArrowBoardDetails),
};

const BLOCK_FILL_POOL_ADAPTER: GamePoolAdapter = {
  invalidJsonMessage: "This JSON doesn't match the expected Block Fill format.",
  buildCreatePayloadFromJson: (input) =>
    buildBlockFillCreatePayloadFromJsonResult(input),
  parseCreatePayload: (payload) => parseBlockFillCreatePayload(payload),
  parseBoard: (board) => parseBlockFillBoard(board),
  formatBoardDetails: (details) =>
    formatBlockFillBoardDetails(details as BlockFillBoardDetails),
};

const SLIDING_PUZZLE_POOL_ADAPTER: GamePoolAdapter = {
  invalidJsonMessage: "This JSON must be an object (not an array).",
  buildCreatePayloadFromJson: (input) => {
    if (!isJsonObject(input.json)) {
      return fail("This JSON must be an object (not an array).");
    }
    const { levelId: _ignored, ...rest } = input.json as Record<
      string,
      JsonValue | undefined
    >;
    return ok({
      levelId: input.levelId,
      name: input.name,
      ...rest,
    });
  },
  parseCreatePayload: (payload) => {
    if (!isRecord(payload)) return fail("Invalid create payload.");
    const levelId = payload.levelId;
    if (!isString(levelId) || !levelId.trim()) {
      return fail("Level ID is required.");
    }
    if (!isString(payload.name) || !payload.name.trim()) {
      return fail("Board name is required.");
    }
    return ok(payload);
  },
  parseBoard: (board) => {
    const parsed = parseBaseBoard(board);
    return parsed ? ok(parsed) : fail("Invalid board response.");
  },
  formatBoardDetails: (details) =>
    formatSlidingPuzzleBoardDetails(details as SlidingPuzzleBoardDetails),
};

function formatInfinityBoardDetails(data: InfinityBoardDetails) {
  if (!data) return null;
  return {
    levelId: data.level?.id || "",
    name: data.name,
    grid: data.grid,
    gridX: data.gridSize?.x || 0,
    gridY: data.gridSize?.y || 0,
    timeLimit: data.timeLimit,
    color: data.color,
  };
}

const INFINITY_POOL_ADAPTER: GamePoolAdapter = {
  ...DEFAULT_POOL_ADAPTER,
  formatBoardDetails: (details) =>
    formatInfinityBoardDetails(details as InfinityBoardDetails),
};

const SUDOKU_POOL_ADAPTER: GamePoolAdapter = {
  invalidJsonMessage: "This JSON must be an object (not an array).",
  buildCreatePayloadFromJson: (input) => {
    if (!isJsonObject(input.json)) {
      return fail("This JSON must be an object (not an array).");
    }
    const { levelId: _ignored, ...rest } = input.json as Record<
      string,
      JsonValue | undefined
    >;
    return ok({
      levelId: input.levelId,
      name: input.name,
      ...rest,
    });
  },
  parseCreatePayload: (payload) => {
    if (!isRecord(payload)) return fail("Invalid create payload.");
    const levelId = payload.levelId;
    if (!isString(levelId) || !levelId.trim()) {
      return fail("Level ID is required.");
    }
    if (!isString(payload.name) || !payload.name.trim()) {
      return fail("Board name is required.");
    }
    return ok(payload);
  },
  parseBoard: (board) => {
    if (!isRecord(board)) return fail("Invalid board response.");
    if (!isString(board.id) || !board.id.trim()) return fail("Missing ID.");
    if (!isString(board.name) || !board.name.trim())
      return fail("Missing Name.");
    return ok(board);
  },
};

const MAZE_POOL_ADAPTER: GamePoolAdapter = {
  invalidJsonMessage: "This JSON doesn't match the expected Maze format.",
  buildCreatePayloadFromJson: (input) =>
    buildMazeCreatePayloadFromJsonResult({
      levelId: input.levelId,
      json: input.json,
    }),
  parseCreatePayload: (payload) => parseMazeCreatePayload(payload),
  parseBoard: (board) => parseMazeTemplateBoard(board),
  formatBoardDetails: (details) =>
    formatMazeTemplateDetails(
      details as MazeTemplateCreateRequest | MazeTemplate,
    ),
};

const SPOT_THE_DIFFERENCE_POOL_ADAPTER: GamePoolAdapter = {
  invalidJsonMessage:
    "This JSON doesn't match the expected Spot the Difference format.",
  buildCreatePayloadFromJson: (input) =>
    buildSpotTheDifferenceCreatePayloadFromJsonResult(input),
  parseCreatePayload: (payload) => {
    if (!isRecord(payload)) return fail("Invalid create payload.");
    if (!isString(payload.levelId) || !payload.levelId.trim()) {
      return fail("Level ID is required.");
    }
    if (!isString(payload.name) || !payload.name.trim()) {
      return fail("Board name is required.");
    }
    if (!isString(payload.findImageUrl) || !payload.findImageUrl.trim()) {
      return fail("Find Image URL is required.");
    }
    if (
      !isString(payload.referenceImageUrl) ||
      !payload.referenceImageUrl.trim()
    ) {
      return fail("Reference Image URL is required.");
    }
    if (!isNumber(payload.imageWidth) || payload.imageWidth <= 0) {
      return fail("Image Width must be a positive number.");
    }
    if (!isNumber(payload.imageHeight) || payload.imageHeight <= 0) {
      return fail("Image Height must be a positive number.");
    }
    if (!Array.isArray(payload.differences)) {
      return fail("Differences must be an array.");
    }
    for (const diff of payload.differences) {
      if (!isRecord(diff)) return fail("Each difference must be an object.");
      if (
        !isNumber(diff.x) ||
        !isNumber(diff.y) ||
        !isNumber(diff.width) ||
        !isNumber(diff.height)
      ) {
        return fail("Each difference coordinate must be a valid number.");
      }
    }
    return ok(payload);
  },
  parseBoard: (board) => {
    if (!isRecord(board)) return fail("Invalid board response.");
    if (!isString(board.id) || !board.id.trim()) return fail("Missing ID.");
    if (!isString(board.name) || !board.name.trim())
      return fail("Missing Name.");
    return ok(board);
  },
  formatBoardDetails: (details) =>
    formatSpotTheDifferenceBoardDetails(
      details as SpotTheDifferenceBoardDetails,
    ),
};

const POOL_ADAPTERS: Record<string, GamePoolAdapter> = {
  arrows: ARROWS_POOL_ADAPTER,
  arrow: ARROWS_POOL_ADAPTER,
  "block-fill": BLOCK_FILL_POOL_ADAPTER,
  "sliding-puzzle": SLIDING_PUZZLE_POOL_ADAPTER,
  "infinity-loop": INFINITY_POOL_ADAPTER,
  sudoku: SUDOKU_POOL_ADAPTER,
  maze: MAZE_POOL_ADAPTER,
  "maze-navigation": MAZE_POOL_ADAPTER,
  "spot-the-difference": SPOT_THE_DIFFERENCE_POOL_ADAPTER,
};

export function getGamePoolAdapter(gameName: string): GamePoolAdapter {
  const slug = slugifyGameName(gameName);
  return POOL_ADAPTERS[slug] ?? DEFAULT_POOL_ADAPTER;
}
