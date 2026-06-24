import type { BaseGameBoard, JsonObject, JsonValue } from "@/types/pool";
import {
  fail,
  ok,
  type ValidationIssue,
  type ValidationResult,
} from "@/lib/validation";

export interface BlockFillPoint {
  row: number;
  col: number;
}

export interface BlockFillNode {
  colorCode: string;
  points: BlockFillPoint[];
}

export interface BlockFillBoard extends BaseGameBoard {
  // Block Fill uses gridRow/gridCol in API; admin normalizes to gridX/gridY too.
  gridRow?: number;
  gridCol?: number;
  nodes: BlockFillNode[];
  nodeCount: number;
}

export interface BlockFillBoardJsonPayload extends JsonObject {
  gridRow?: JsonValue;
  gridCol?: JsonValue;
  nodes?: JsonValue;
  name?: JsonValue;
}

export interface CreateBlockFillBoardRequest {
  levelId: string;
  name: string;
  gridRow: number;
  gridCol: number;
  nodes: BlockFillNode[];
}

function isJsonObject(
  value: JsonValue | undefined,
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

export function parseBlockFillNodes(nodes: unknown): BlockFillNode[] | null {
  if (!Array.isArray(nodes)) return null;

  const parsed: BlockFillNode[] = [];
  for (const node of nodes) {
    if (!isRecord(node)) return null;
    if (!isString(node.colorCode) || !node.colorCode.trim()) return null;
    if (!Array.isArray(node.points)) return null;

    const points: BlockFillPoint[] = [];
    for (const point of node.points) {
      if (!isRecord(point)) return null;
      if (!isNumber(point.row) || !isNumber(point.col)) return null;
      points.push({ row: point.row, col: point.col });
    }

    parsed.push({ colorCode: node.colorCode.trim(), points });
  }

  return parsed;
}

export function parseBlockFillBoard(
  board: unknown,
): ValidationResult<BlockFillBoard> {
  if (!isRecord(board)) return fail("Invalid Block Fill board response.");
  if (!isString(board.id) || !board.id.trim()) return fail("Missing board id.");
  if (!isString(board.name) || !board.name.trim())
    return fail("Missing board name.");
  if (!isNumber(board.gridRow) || !isNumber(board.gridCol)) {
    return fail("Missing gridRow/gridCol.");
  }

  const nodes = parseBlockFillNodes(board.nodes);
  if (!nodes) return fail("Invalid nodes array.");

  return ok({
    ...(board as unknown as BlockFillBoard),
    gridRow: board.gridRow,
    gridCol: board.gridCol,
    // normalize for shared table components
    gridX: board.gridCol,
    gridY: board.gridRow,
    nodes,
    nodeCount: nodes.length,
  });
}

export function parseBlockFillCreatePayload(
  payload: unknown,
): ValidationResult<CreateBlockFillBoardRequest> {
  if (!isRecord(payload)) return fail("Invalid Block Fill create payload.");
  if (!isString(payload.levelId) || !payload.levelId.trim()) {
    return fail("levelId is required.");
  }
  if (!isString(payload.name) || !payload.name.trim()) {
    return fail("name is required.");
  }
  if (!isNumber(payload.gridRow) || !isNumber(payload.gridCol)) {
    return fail("gridRow and gridCol must be numbers.");
  }
  const nodes = parseBlockFillNodes(payload.nodes);
  if (!nodes) return fail("nodes must be an array of { colorCode, points[] }.");

  return ok({
    levelId: payload.levelId,
    name: payload.name,
    gridRow: payload.gridRow,
    gridCol: payload.gridCol,
    nodes,
  });
}

export function buildBlockFillCreatePayloadFromJsonResult(input: {
  levelId: string;
  name: string;
  json: JsonValue;
}): ValidationResult<CreateBlockFillBoardRequest> {
  if (!isJsonObject(input.json)) {
    return fail("This JSON must be an object (not an array).");
  }

  const issues: ValidationIssue[] = [];
  const record = input.json;

  if (!isNumber(record.gridRow) || !isNumber(record.gridCol)) {
    issues.push({
      path: "gridRow/gridCol",
      message: "gridRow and gridCol must be numbers.",
    });
  }

  const nodes = parseBlockFillNodes(record.nodes);
  if (!nodes) {
    issues.push({
      path: "nodes",
      message: "nodes must be an array of { colorCode, points[] }.",
    });
  }

  if (issues.length) return fail("Invalid Block Fill board JSON.", issues);

  return ok({
    levelId: input.levelId,
    name: input.name,
    gridRow: record.gridRow as number,
    gridCol: record.gridCol as number,
    nodes: nodes!,
  });
}

export interface BlockFillBoardDetails extends BlockFillBoard {
  level?: { id: string; name: string };
}

/**
 * Transforms the raw API response for block fill board details into the requested format.
 */
export function formatBlockFillBoardDetails(data: BlockFillBoardDetails): unknown {
  if (!data) return null;

  return {
    levelId: data.level?.id || "",
    name: data.name,
    gridRow: data.gridRow,
    gridCol: data.gridCol,
    nodes: (data.nodes || []).map((node) => ({
      colorCode: node.colorCode,
    })),
  };
}
