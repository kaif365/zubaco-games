import type { BlockFillPairInput, GridPoint } from './block-fill-helpers';
import { isAdjacent, isPointInsideGrid, pointKey, samePoint } from './block-fill-helpers';

interface SolverOptions {
    gridX: number;
    gridY: number;
    pairs: BlockFillPairInput[];
}

interface SolveState {
    gridX: number;
    gridY: number;
    pairs: BlockFillPairInput[];
    blockedEndpoints: Set<string>;
    totalCells: number;
}

const DIRECTIONS: GridPoint[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
];

export function hasBlockFillSolution(options: SolverOptions): boolean {
    const blockedEndpoints = new Set<string>();
    for (const pair of options.pairs) {
        blockedEndpoints.add(pointKey(pair.start.x, pair.start.y));
        blockedEndpoints.add(pointKey(pair.end.x, pair.end.y));
    }

    const state: SolveState = {
        ...options,
        blockedEndpoints,
        totalCells: options.gridX * options.gridY,
    };

    return solvePairs(state, options.pairs, new Set<string>());
}

/**
 * Recursively solves remaining pairs while tracking occupied cells.
 * @param {SolveState} state - The immutable solver state.
 * @param {BlockFillPairInput[]} remainingPairs - The pairs still to solve.
 * @param {Set<string>} occupied - The currently occupied cell keys.
 * @returns {boolean} Whether a full-board solution exists.
 */
function solvePairs(
    state: SolveState,
    remainingPairs: BlockFillPairInput[],
    occupied: Set<string>,
): boolean {
    if (remainingPairs.length === 0) {
        return occupied.size === state.totalCells;
    }

    const orderedPairs = [...remainingPairs].sort(
        (a, b) => shortestDistance(a.start, a.end) - shortestDistance(b.start, b.end),
    );

    const pair = orderedPairs[0];
    const nextRemaining = orderedPairs.slice(1);
    const candidates = enumeratePaths(state, pair, occupied, nextRemaining);

    for (const candidate of candidates) {
        const nextOccupied = new Set(occupied);
        for (const point of candidate) {
            nextOccupied.add(pointKey(point.x, point.y));
        }

        if (hasUnreachableCells(state, nextRemaining, nextOccupied)) {
            continue;
        }

        if (solvePairs(state, nextRemaining, nextOccupied)) {
            return true;
        }
    }

    return false;
}

/**
 * Enumerates candidate paths for a pair under the current solver state.
 * @param {SolveState} state - The immutable solver state.
 * @param {BlockFillPairInput} pair - The pair to expand.
 * @param {Set<string>} occupied - The currently occupied cell keys.
 * @param {BlockFillPairInput[]} remainingPairs - The pairs that remain after this one.
 * @returns {GridPoint[][]} The candidate paths for the pair.
 */
function enumeratePaths(
    state: SolveState,
    pair: BlockFillPairInput,
    occupied: Set<string>,
    remainingPairs: BlockFillPairInput[],
): GridPoint[][] {
    const paths: GridPoint[][] = [];
    const localVisited = new Set<string>([pointKey(pair.start.x, pair.start.y)]);
    const maxPaths = 2000;

    const reservedEndpoints = new Set<string>();
    for (const otherPair of remainingPairs) {
        reservedEndpoints.add(pointKey(otherPair.start.x, otherPair.start.y));
        reservedEndpoints.add(pointKey(otherPair.end.x, otherPair.end.y));
    }

    const dfs = (current: GridPoint, path: GridPoint[]) => {
        if (paths.length >= maxPaths) {
            return;
        }

        if (samePoint(current, pair.end)) {
            paths.push([...path]);
            return;
        }

        const nextSteps = DIRECTIONS.map((dir) => ({ x: current.x + dir.x, y: current.y + dir.y }))
            .filter((point) =>
                isMoveAllowed(state, point, pair.end, occupied, localVisited, reservedEndpoints),
            )
            .sort((a, b) => shortestDistance(a, pair.end) - shortestDistance(b, pair.end));

        for (const next of nextSteps) {
            localVisited.add(pointKey(next.x, next.y));
            path.push(next);

            if (
                canStillReachEnd(state, next, pair.end, occupied, localVisited, reservedEndpoints)
            ) {
                dfs(next, path);
            }

            path.pop();
            localVisited.delete(pointKey(next.x, next.y));
        }
    };

    dfs(pair.start, [pair.start]);
    return paths;
}

/**
 * Checks whether a path step can be taken.
 * @param {SolveState} state - The immutable solver state.
 * @param {GridPoint} point - The candidate point to move into.
 * @param {GridPoint} end - The destination endpoint for the active pair.
 * @param {Set<string>} occupied - The globally occupied cell keys.
 * @param {Set<string>} localVisited - The cells already visited by the active path.
 * @param {Set<string>} reservedEndpoints - The endpoints reserved for other pairs.
 * @returns {boolean} Whether the move is allowed.
 */
function isMoveAllowed(
    state: SolveState,
    point: GridPoint,
    end: GridPoint,
    occupied: Set<string>,
    localVisited: Set<string>,
    reservedEndpoints: Set<string>,
): boolean {
    if (!isPointInsideGrid(point, state.gridX, state.gridY)) {
        return false;
    }

    const key = pointKey(point.x, point.y);
    if (occupied.has(key) || localVisited.has(key)) {
        return false;
    }

    if (samePoint(point, end)) {
        return true;
    }

    return !reservedEndpoints.has(key);
}

/**
 * Checks whether the active path can still reach its end point.
 * @param {SolveState} state - The immutable solver state.
 * @param {GridPoint} from - The current traversal point.
 * @param {GridPoint} end - The destination endpoint.
 * @param {Set<string>} occupied - The globally occupied cell keys.
 * @param {Set<string>} localVisited - The cells already visited by the active path.
 * @param {Set<string>} reservedEndpoints - The endpoints reserved for other pairs.
 * @returns {boolean} Whether the end point is still reachable.
 */
function canStillReachEnd(
    state: SolveState,
    from: GridPoint,
    end: GridPoint,
    occupied: Set<string>,
    localVisited: Set<string>,
    reservedEndpoints: Set<string>,
): boolean {
    const queue = [from];
    const seen = new Set<string>([pointKey(from.x, from.y)]);

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (samePoint(current, end)) {
            return true;
        }

        for (const direction of DIRECTIONS) {
            const next = { x: current.x + direction.x, y: current.y + direction.y };
            const key = pointKey(next.x, next.y);
            if (seen.has(key)) {
                continue;
            }

            if (!isPointInsideGrid(next, state.gridX, state.gridY)) {
                continue;
            }

            if (samePoint(next, end)) {
                return true;
            }

            if (occupied.has(key) || localVisited.has(key) || reservedEndpoints.has(key)) {
                continue;
            }

            seen.add(key);
            queue.push(next);
        }
    }

    return false;
}

/**
 * Checks whether any remaining pair has become unreachable.
 * @param {SolveState} state - The immutable solver state.
 * @param {BlockFillPairInput[]} remainingPairs - The pairs still to solve.
 * @param {Set<string>} occupied - The currently occupied cell keys.
 * @returns {boolean} Whether any remaining pair is unreachable.
 */
function hasUnreachableCells(
    state: SolveState,
    remainingPairs: BlockFillPairInput[],
    occupied: Set<string>,
): boolean {
    for (const pair of remainingPairs) {
        if (!hasOpenRoute(state, pair.start, pair.end, occupied, remainingPairs, pair.color)) {
            return true;
        }
    }

    return false;
}

/**
 * Checks whether a pair still has an open route between its endpoints.
 * @param {SolveState} state - The immutable solver state.
 * @param {GridPoint} start - The start endpoint.
 * @param {GridPoint} end - The end endpoint.
 * @param {Set<string>} occupied - The currently occupied cell keys.
 * @param {BlockFillPairInput[]} pairs - The remaining pairs used to reserve endpoints.
 * @param {string} activeColor - The active pair color.
 * @returns {boolean} Whether an open route still exists.
 */
function hasOpenRoute(
    state: SolveState,
    start: GridPoint,
    end: GridPoint,
    occupied: Set<string>,
    pairs: BlockFillPairInput[],
    activeColor: string,
): boolean {
    const blocked = new Set<string>();
    for (const pair of pairs) {
        if (pair.color === activeColor) {
            continue;
        }

        blocked.add(pointKey(pair.start.x, pair.start.y));
        blocked.add(pointKey(pair.end.x, pair.end.y));
    }

    const queue = [start];
    const seen = new Set<string>([pointKey(start.x, start.y)]);

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (samePoint(current, end)) {
            return true;
        }

        for (const direction of DIRECTIONS) {
            const next = { x: current.x + direction.x, y: current.y + direction.y };
            const key = pointKey(next.x, next.y);
            if (seen.has(key) || !isPointInsideGrid(next, state.gridX, state.gridY)) {
                continue;
            }

            if (samePoint(next, end)) {
                return true;
            }

            if (occupied.has(key) || blocked.has(key)) {
                continue;
            }

            seen.add(key);
            queue.push(next);
        }
    }

    return false;
}

/**
 * Calculates a heuristic distance between two points.
 * @param {GridPoint} a - The first point.
 * @param {GridPoint} b - The second point.
 * @returns {number} The heuristic distance.
 */
function shortestDistance(a: GridPoint, b: GridPoint): number {
    if (isAdjacent(a, b)) {
        return 1;
    }

    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
