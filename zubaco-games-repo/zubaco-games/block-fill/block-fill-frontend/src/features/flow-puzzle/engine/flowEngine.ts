import type {
  FlowBoardStats,
  FlowPuzzleLevel,
  FlowSessionState,
  GridCoord,
  FlowPathMap,
} from '@/features/flow-puzzle/types';
import { getLevelCols, getLevelRows } from '@/features/flow-puzzle/utils/levelGrid';

interface EndpointHit {
  colorId: string;
  endpointIndex: 0 | 1;
}

const EMPTY_PATHS: FlowPathMap = {};

export function coordKey(coord: GridCoord) {
  return `${coord.row}:${coord.col}`;
}

export function areCoordsEqual(a: GridCoord, b: GridCoord) {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: GridCoord, b: GridCoord) {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  return rowDiff + colDiff === 1;
}

export function createFlowSession(level: FlowPuzzleLevel): FlowSessionState {
  const paths = level.nodes.reduce<FlowPathMap>((accumulator, node) => {
    accumulator[node.colorId] = [];
    return accumulator;
  }, {});

  return {
    paths,
    activePath: null,
    moveCount: 0,
    isSolved: false,
  };
}

export function getRequiredCells(level: FlowPuzzleLevel) {
  if (level.enabledCells && level.enabledCells.length > 0) {
    return level.enabledCells;
  }

  const blocked = new Set((level.blockedCells ?? []).map(coordKey));
  const cells: GridCoord[] = [];
  const rows = getLevelRows(level);
  const cols = getLevelCols(level);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const coord = { row, col };
      if (!blocked.has(coordKey(coord))) {
        cells.push(coord);
      }
    }
  }
  return cells;
}

export function isCellEnabled(level: FlowPuzzleLevel, coord: GridCoord) {
  const rows = getLevelRows(level);
  const cols = getLevelCols(level);
  if (coord.row < 0 || coord.col < 0 || coord.row >= rows || coord.col >= cols) {
    return false;
  }

  const blocked = new Set((level.blockedCells ?? []).map(coordKey));
  if (blocked.has(coordKey(coord))) {
    return false;
  }

  if (!level.enabledCells || level.enabledCells.length === 0) {
    return true;
  }

  const enabled = new Set(level.enabledCells.map(coordKey));
  return enabled.has(coordKey(coord));
}

export function buildOccupancy(paths: FlowPathMap) {
  const occupancy = new Map<string, string>();

  Object.entries(paths).forEach(([colorId, coords]) => {
    coords.forEach((coord) => {
      occupancy.set(coordKey(coord), colorId);
    });
  });

  return occupancy;
}

export function findNodeByColor(level: FlowPuzzleLevel, colorId: string) {
  return level.nodes.find((node) => node.colorId === colorId) ?? null;
}

export function findEndpointHit(level: FlowPuzzleLevel, coord: GridCoord): EndpointHit | null {
  for (const node of level.nodes) {
    if (areCoordsEqual(node.endpoints[0], coord)) {
      return { colorId: node.colorId, endpointIndex: 0 };
    }
    if (areCoordsEqual(node.endpoints[1], coord)) {
      return { colorId: node.colorId, endpointIndex: 1 };
    }
  }
  return null;
}

function trimPathToCoord(path: GridCoord[], coord: GridCoord) {
  const targetIndex = path.findIndex((cell) => areCoordsEqual(cell, coord));
  if (targetIndex === -1) {
    return [...path];
  }
  return path.slice(0, targetIndex + 1);
}

function getColorForExistingPath(paths: FlowPathMap, coord: GridCoord) {
  return (
    Object.entries(paths).find(([, cells]) =>
      cells.some((cell) => areCoordsEqual(cell, coord)),
    )?.[0] ?? null
  );
}

export function beginPathDraw(
  session: FlowSessionState,
  level: FlowPuzzleLevel,
  coord: GridCoord,
): FlowSessionState {
  if (!isCellEnabled(level, coord)) {
    return session;
  }

  const endpointHit = findEndpointHit(level, coord);
  const ownedColor = endpointHit?.colorId ?? getColorForExistingPath(session.paths, coord);
  if (!ownedColor) {
    return session;
  }

  const currentPath = session.paths[ownedColor] ?? [];
  const committedBefore = endpointHit?.colorId === ownedColor ? [] : currentPath;
  const basePath =
    endpointHit?.colorId === ownedColor
      ? [coord]
      : currentPath.length > 0 && currentPath.some((cell) => areCoordsEqual(cell, coord))
        ? trimPathToCoord(currentPath, coord)
        : [coord];

  return {
    ...session,
    paths: {
      ...session.paths,
      [ownedColor]: basePath,
    },
    activePath: {
      colorId: ownedColor,
      cells: basePath,
      committedBefore,
    },
  };
}

export function dragPathToCell(
  session: FlowSessionState,
  level: FlowPuzzleLevel,
  coord: GridCoord,
): FlowSessionState {
  const activePath = session.activePath;
  if (!activePath) {
    return session;
  }

  const currentCells = activePath.cells;
  const lastCell = currentCells[currentCells.length - 1];
  if (!lastCell || areCoordsEqual(lastCell, coord)) {
    return session;
  }

  if (!isAdjacent(lastCell, coord) || !isCellEnabled(level, coord)) {
    return session;
  }

  const previousCell = currentCells[currentCells.length - 2];
  if (previousCell && areCoordsEqual(previousCell, coord)) {
    const nextCells = currentCells.slice(0, -1);
    return {
      ...session,
      paths: {
        ...session.paths,
        [activePath.colorId]: nextCells,
      },
      activePath: {
        ...activePath,
        cells: nextCells,
      },
    };
  }

  const existingIndex = currentCells.findIndex((cell) => areCoordsEqual(cell, coord));
  if (existingIndex >= 0) {
    const strokeStart = currentCells[0];
    const strokeStartedOnOwnDot =
      strokeStart && findEndpointHit(level, strokeStart)?.colorId === activePath.colorId;
    // Don't let one adjacent swipe onto the stroke's starting dot wipe the whole path; the
    // player can still shorten back to that dot one cell at a time (previousCell branch).
    if (
      existingIndex === 0 &&
      currentCells.length > 1 &&
      strokeStartedOnOwnDot &&
      areCoordsEqual(coord, strokeStart)
    ) {
      return session;
    }

    const trimmed = currentCells.slice(0, existingIndex + 1);
    return {
      ...session,
      paths: {
        ...session.paths,
        [activePath.colorId]: trimmed,
      },
      activePath: {
        ...activePath,
        cells: trimmed,
      },
    };
  }

  const occupancy = buildOccupancy({
    ...session.paths,
    [activePath.colorId]: currentCells,
  });
  const occupiedBy = occupancy.get(coordKey(coord));
  const endpointHit = findEndpointHit(level, coord);

  if (occupiedBy && occupiedBy !== activePath.colorId) {
    return session;
  }

  if (endpointHit && endpointHit.colorId !== activePath.colorId) {
    return session;
  }

  /** Same-colour dots behave like terminals: enter the partner dot to finish, never pass through / extend past either dot. */
  const nodeOwn = findNodeByColor(level, activePath.colorId);
  if (nodeOwn) {
    const epA = nodeOwn.endpoints[0];
    const epB = nodeOwn.endpoints[1];
    const touchA = currentCells.some((cell) => areCoordsEqual(cell, epA));
    const touchB = currentCells.some((cell) => areCoordsEqual(cell, epB));
    const lastOnOwnDot = areCoordsEqual(lastCell, epA) || areCoordsEqual(lastCell, epB);

    // Once both dots are visited, tip on a dot can only retract (already handled above), not lengthen.
    if (touchA && touchB && lastOnOwnDot) {
      return session;
    }

    if (endpointHit && endpointHit.colorId === activePath.colorId) {
      const towardA = areCoordsEqual(coord, epA);
      const towardB = areCoordsEqual(coord, epB);

      const firstDotFromInterior = !touchA && !touchB && (towardA || towardB);
      const stepOntoOppositeDot = (touchA && !touchB && towardB) || (touchB && !touchA && towardA);

      if (!firstDotFromInterior && !stepOntoOppositeDot) {
        return session;
      }
    }
  }

  const nextCells = [...currentCells, coord];
  return {
    ...session,
    paths: {
      ...session.paths,
      [activePath.colorId]: nextCells,
    },
    activePath: {
      ...activePath,
      cells: nextCells,
    },
  };
}

export function isColorPathComplete(level: FlowPuzzleLevel, colorId: string, path: GridCoord[]) {
  const node = findNodeByColor(level, colorId);
  if (!node || path.length < 2) {
    return false;
  }

  const start = path[0];
  const end = path[path.length - 1];
  const [a, b] = node.endpoints;

  return (
    (areCoordsEqual(start, a) && areCoordsEqual(end, b)) ||
    (areCoordsEqual(start, b) && areCoordsEqual(end, a))
  );
}

export function getBoardStats(level: FlowPuzzleLevel, session: FlowSessionState): FlowBoardStats {
  const requiredCells = getRequiredCells(level);
  const occupancy = buildOccupancy(session.paths);
  const coveredRequiredCells = requiredCells.filter((coord) =>
    occupancy.has(coordKey(coord)),
  ).length;
  const completedPairs = level.nodes.filter((node) =>
    isColorPathComplete(level, node.colorId, session.paths[node.colorId] ?? []),
  ).length;

  return {
    totalRequiredCells: requiredCells.length,
    coveredRequiredCells,
    coveragePercent:
      requiredCells.length === 0
        ? 0
        : Math.round((coveredRequiredCells / requiredCells.length) * 100),
    completedPairs,
    totalPairs: level.nodes.length,
  };
}

export function isPuzzleSolved(level: FlowPuzzleLevel, session: FlowSessionState) {
  const requireFullCoverage = level.objectives?.requireFullCoverage ?? true;
  const totalPairs = level.nodes.length;
  const completedPairs = level.nodes.filter((node) =>
    isColorPathComplete(level, node.colorId, session.paths[node.colorId] ?? []),
  ).length;

  // Only evaluate expensive full-grid coverage after all connections are complete.
  if (completedPairs !== totalPairs) {
    return false;
  }

  if (!requireFullCoverage) {
    return true;
  }

  const requiredCells = getRequiredCells(level);
  const occupancy = buildOccupancy(session.paths);
  const coveredRequiredCells = requiredCells.filter((coord) =>
    occupancy.has(coordKey(coord)),
  ).length;
  return coveredRequiredCells === requiredCells.length;
}

export function endPathDraw(session: FlowSessionState, level: FlowPuzzleLevel): FlowSessionState {
  if (!session.activePath) {
    return session;
  }

  const activePathComplete = isColorPathComplete(
    level,
    session.activePath.colorId,
    session.activePath.cells,
  );
  const resolvedPaths = activePathComplete
    ? session.paths
    : {
        ...session.paths,
        [session.activePath.colorId]: session.activePath.committedBefore,
      };
  const pathChanged =
    activePathComplete &&
    JSON.stringify(session.activePath.cells) !== JSON.stringify(session.activePath.committedBefore);

  const nextSession: FlowSessionState = {
    ...session,
    paths: resolvedPaths,
    activePath: null,
    moveCount: pathChanged ? session.moveCount + 1 : session.moveCount,
  };

  return {
    ...nextSession,
    isSolved: isPuzzleSolved(level, nextSession),
  };
}

export function resetFlowSession(level: FlowPuzzleLevel) {
  return createFlowSession(level);
}

export function calculateScore(timeLimitSec: number, elapsedMs: number) {
  return Math.max(0, timeLimitSec - Math.floor(elapsedMs / 1000));
}

export function getPathMapOrEmpty(paths?: FlowPathMap) {
  return paths ?? EMPTY_PATHS;
}
