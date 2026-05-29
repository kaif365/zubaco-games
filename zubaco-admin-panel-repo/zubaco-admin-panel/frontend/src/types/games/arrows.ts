import type { BaseGameBoard, JsonObject, JsonValue } from "@/types/pool";
import {
  fail,
  ok,
  type ValidationIssue,
  type ValidationResult,
} from "@/lib/validation";

export interface Waypoint {
  x: number;
  y: number;
}

export interface Arrow {
  waypoints: Waypoint[];
  headDirection: number;
  color: number;
}

export type ArrowHeadDirectionString = "up" | "right" | "down" | "left";

export interface ArrowV2 {
  waypoints: Waypoint[];
  headDirection: ArrowHeadDirectionString;
  color: number;
}

export interface ArrowsBoard extends BaseGameBoard {
  arrowCount: number;
}

// Uploaded JSON payload types (Arrows).
export interface WaypointJson extends JsonObject {
  x: number;
  y: number;
}

export interface ArrowJson extends JsonObject {
  waypoints: WaypointJson[];
  headDirection: JsonValue;
  color: number;
}

export interface ArrowsBoardJsonPayload extends JsonObject {
  gridX?: number;
  gridY?: number;
  gridSize?: { x?: JsonValue; y?: JsonValue } & JsonObject;
  arrows?: JsonValue;
  name?: JsonValue;
}

// Create payload type (Arrows).
export interface CreateArrowsBoardRequest {
  levelId: string;
  name: string;
  gridSize: { x: number; y: number };
  arrows: ArrowV2[];
}

function isJsonObject(
  value: JsonValue | undefined,
): value is Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHeadDirection(
  value: JsonValue | undefined,
): ArrowHeadDirectionString | null {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "up" ||
      normalized === "right" ||
      normalized === "down" ||
      normalized === "left"
    ) {
      return normalized as ArrowHeadDirectionString;
    }
    return null;
  }

  // Allow numeric mapping if someone uploads the older format:
  // 0=up, 1=right, 2=down, 3=left
  if (typeof value === "number") {
    switch (value) {
      case 0:
        return "up";
      case 1:
        return "right";
      case 2:
        return "down";
      case 3:
        return "left";
      default:
        return null;
    }
  }

  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateArrowsJson(
  json: JsonValue,
): ValidationResult<{ gridSize: { x: number; y: number }; arrows: ArrowV2[] }> {
  if (!isJsonObject(json)) {
    return fail("Board JSON must be an object (not an array).");
  }

  const issues: ValidationIssue[] = [];

  const arrowsValue = json.arrows;
  if (!Array.isArray(arrowsValue)) {
    issues.push({ path: "arrows", message: "Expected an array of arrows." });
  }

  // Server expects gridSize always; accept either `gridSize` or derive from `gridX/gridY`.
  const gridSize = json.gridSize;
  const gridX = json.gridX;
  const gridY = json.gridY;

  const gridFromGridSize =
    isJsonObject(gridSize) &&
    isFiniteNumber(gridSize.x) &&
    isFiniteNumber(gridSize.y)
      ? { x: gridSize.x, y: gridSize.y }
      : null;

  const gridFromXY =
    isFiniteNumber(gridX) && isFiniteNumber(gridY)
      ? { x: gridX, y: gridY }
      : null;

  const finalGridSize = gridFromGridSize ?? gridFromXY;
  if (!finalGridSize) {
    issues.push({
      path: "gridSize",
      message: "Expected gridSize.{x,y} or gridX/gridY as numbers.",
    });
  }

  const normalizedArrows: ArrowV2[] = [];
  if (Array.isArray(arrowsValue)) {
    arrowsValue.forEach((arrowValue, arrowIndex) => {
      if (!isJsonObject(arrowValue)) {
        issues.push({
          path: `arrows[${arrowIndex}]`,
          message: "Expected an object.",
        });
        return;
      }

      const waypointsValue = arrowValue.waypoints;
      if (!Array.isArray(waypointsValue)) {
        issues.push({
          path: `arrows[${arrowIndex}].waypoints`,
          message: "Expected an array of waypoints.",
        });
        return;
      }

      const headDirection = normalizeHeadDirection(arrowValue.headDirection);
      if (!headDirection) {
        issues.push({
          path: `arrows[${arrowIndex}].headDirection`,
          message: "Expected one of up/right/down/left (or 0-3).",
        });
      }

      const color = arrowValue.color;
      if (!isFiniteNumber(color)) {
        issues.push({
          path: `arrows[${arrowIndex}].color`,
          message: "Expected a number.",
        });
      }

      const waypoints: Waypoint[] = [];
      waypointsValue.forEach((wpValue, wpIndex) => {
        if (!isJsonObject(wpValue)) {
          issues.push({
            path: `arrows[${arrowIndex}].waypoints[${wpIndex}]`,
            message: "Expected an object.",
          });
          return;
        }

        if (!isFiniteNumber(wpValue.x) || !isFiniteNumber(wpValue.y)) {
          issues.push({
            path: `arrows[${arrowIndex}].waypoints[${wpIndex}]`,
            message: "Expected numeric x and y.",
          });
          return;
        }

        waypoints.push({ x: wpValue.x, y: wpValue.y });
      });

      if (headDirection && isFiniteNumber(color)) {
        normalizedArrows.push({
          waypoints,
          headDirection,
          color,
        });
      }
    });
  }

  if (issues.length) {
    return fail("Invalid Arrows board JSON.", issues);
  }

  return ok({ gridSize: finalGridSize!, arrows: normalizedArrows });
}

export function buildArrowsCreatePayloadFromJsonResult(input: {
  levelId: string;
  name: string;
  json: JsonValue;
}): ValidationResult<CreateArrowsBoardRequest> {
  const validated = validateArrowsJson(input.json);
  if (!validated.ok) return validated;

  return ok({
    levelId: input.levelId,
    name: input.name,
    gridSize: validated.value.gridSize,
    arrows: validated.value.arrows,
  });
}

export function buildArrowsCreatePayloadFromJson(input: {
  levelId: string;
  name: string;
  json: JsonValue;
}): CreateArrowsBoardRequest | null {
  const result = buildArrowsCreatePayloadFromJsonResult(input);
  return result.ok ? result.value : null;
}

export interface ArrowBoardDetails {
  id: string;
  name: string;
  gridSize: { x: number; y: number };
  arrows: Array<{
    waypoints: Waypoint[];
    headDirection: ArrowHeadDirectionString;
    color: number;
    [key: string]: unknown;
  }>;
}

/**
 * Transforms the raw API response for arrow board details into the requested format.
 */
export function formatArrowBoardDetails(data: ArrowBoardDetails): {
  id: string;
  name: string;
  gridSize: { x: number; y: number };
  arrows: ArrowV2[];
} | null {
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    gridSize: data.gridSize,
    arrows: (data.arrows || []).map((arrow) => ({
      waypoints: (arrow.waypoints || []).map((wp: Waypoint) => ({
        x: wp.x,
        y: wp.y,
      })),
      headDirection: arrow.headDirection,
      color: arrow.color,
    })),
  };
}
