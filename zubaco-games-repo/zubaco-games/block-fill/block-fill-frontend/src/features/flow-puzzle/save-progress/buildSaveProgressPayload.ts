import { v4 as uuidv4 } from 'uuid';
import type { FlowPuzzleLevel, FlowPathMap, GridCoord } from '@/features/flow-puzzle/types';
import { isColorPathComplete } from '@/features/flow-puzzle/engine/flowEngine';
import type {
  SaveProgressBoardPayload,
  SaveProgressPathPayload,
} from '@/features/flow-puzzle/save-progress/saveProgressTypes';

/**
 * Generates a unique move identifier using the `uuid` package — works in all browser contexts (HTTP and HTTPS).
 *
 * @returns A UUID v4 string
 */
export function moveIdNew(): string {
  return uuidv4();
}

/**
 * Returns a stable JSON string fingerprint for a path — used to detect whether a path has changed since the last save.
 *
 * @param path The path coordinates to fingerprint
 * @returns A stable JSON string fingerprint of the path
 */
export function pathSignature(path: GridCoord[]): string {
  return JSON.stringify(path);
}

/**
 * Strips any extra fields from GridCoord to produce plain `{ row, col }` objects safe for serialisation.
 *
 * @param coords The coordinates to clone
 * @returns Plain coordinate objects safe for serialization
 */
function cloneCoords(coords: GridCoord[]): Array<{ row: number; col: number }> {
  return coords.map((c) => ({ row: c.row, col: c.col }));
}

/**
 * Builds move payloads for all non-empty paths in the current level.
 *
 * @param params
 * @param params.level The current level
 * @param params.paths Current path state keyed by color ID
 * @returns Move payloads for each non-empty path
 */
export function buildPathMovePayloads(params: {
  level: FlowPuzzleLevel;
  paths: FlowPathMap;
}): SaveProgressPathPayload[] {
  const { level, paths } = params;
  return level.nodes
    .map((node) => {
      const raw = paths[node.colorId] ?? [];
      if (raw.length === 0) {
        return null;
      }

      const iso = new Date().toISOString();
      return {
        color: node.colorId,
        path: cloneCoords(raw),
        completed: isColorPathComplete(level, node.colorId, raw),
        moveId: moveIdNew(),
        timeStamp: iso,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

/**
 * One payload per node (including cleared paths `path: []`) so backends can reconcile removals like additions.
 *
 * @param params.level Board definition
 * @param params.paths Current committed path map (`activePath` should be merged into paths before calling)
 */
export function buildSaveProgressPathPayloadsForAllColors(params: {
  level: FlowPuzzleLevel;
  paths: FlowPathMap;
}): SaveProgressPathPayload[] {
  const { level, paths } = params;
  const iso = new Date().toISOString();
  return level.nodes.map((node) => {
    const raw = paths[node.colorId] ?? [];
    return {
      color: node.colorId,
      path: cloneCoords(raw),
      completed: raw.length > 0 ? isColorPathComplete(level, node.colorId, raw) : false,
      moveId: moveIdNew(),
      timeStamp: iso,
    };
  });
}

/**
 * Assembles the board-level save payload from a session board ID, version, and pre-built path payloads.
 *
 * @param params
 * @param params.sessionBoardId The backend-assigned board identifier
 * @param params.version The current board version from the server
 * @param params.paths Path payloads built by buildPathMovePayloads
 * @returns The assembled board save payload
 */
export function buildBoardSavePayload(params: {
  sessionBoardId: string;
  version: number;
  paths: SaveProgressPathPayload[];
}): SaveProgressBoardPayload {
  const { sessionBoardId, version, paths } = params;
  return {
    sessionBoardId,
    version,
    paths,
  };
}
