import { BadRequestException } from '@nestjs/common';

import type { BlockFillPairInput, BlockFillSavedPath, GridPoint } from './block-fill-helpers';
import {
    endpointsMatch,
    isAdjacent,
    isPointInsideGrid,
    pathTouchesEndpoint,
    pointKey,
    samePoint,
} from './block-fill-helpers';

interface SnapshotValidationOptions {
    gridX: number;
    gridY: number;
    pairs: BlockFillPairInput[];
    paths: BlockFillSavedPath[];
    requireFullCoverage?: boolean;
}

export function validateBlockFillPairs(
    gridX: number,
    gridY: number,
    pairs: BlockFillPairInput[],
): void {
    if (pairs.length === 0) {
        throw new BadRequestException('BLOCK_FILL_PAIRS_REQUIRED');
    }

    const endpointCells = new Set<string>();
    const colors = new Set<string>();

    for (const pair of pairs) {
        if (colors.has(pair.color)) {
            throw new BadRequestException('BLOCK_FILL_DUPLICATE_COLOR');
        }

        if (
            !isPointInsideGrid(pair.start, gridX, gridY) ||
            !isPointInsideGrid(pair.end, gridX, gridY)
        ) {
            throw new BadRequestException('BLOCK_FILL_ENDPOINT_OUT_OF_BOUNDS');
        }

        if (samePoint(pair.start, pair.end)) {
            throw new BadRequestException('BLOCK_FILL_ENDPOINTS_MUST_DIFFER');
        }

        const startKey = pointKey(pair.start.x, pair.start.y);
        const endKey = pointKey(pair.end.x, pair.end.y);

        if (endpointCells.has(startKey) || endpointCells.has(endKey)) {
            throw new BadRequestException('BLOCK_FILL_DUPLICATE_ENDPOINT');
        }

        endpointCells.add(startKey);
        endpointCells.add(endKey);
        colors.add(pair.color);
    }
}

/**
 * Validates an in-progress or completed block-fill snapshot.
 * @param {SnapshotValidationOptions} options - The snapshot validation options.
 * @returns {{ completedColors: string[]; occupiedCount: number }} The derived completion and occupancy summary.
 */
export function validateBlockFillSnapshot(options: SnapshotValidationOptions): {
    completedColors: string[];
    occupiedCount: number;
} {
    const { gridX, gridY, pairs, paths, requireFullCoverage = false } = options;
    validateBlockFillPairs(gridX, gridY, pairs);

    const pairByColor = new Map(pairs.map((pair) => [pair.color, pair]));
    const seenColors = new Set<string>();
    const occupiedCells = new Map<string, string>();
    const completedColors: string[] = [];

    for (const savedPath of paths) {
        const pair = pairByColor.get(savedPath.color);
        if (!pair) {
            throw new BadRequestException('BLOCK_FILL_UNKNOWN_COLOR');
        }

        if (seenColors.has(savedPath.color)) {
            throw new BadRequestException('BLOCK_FILL_DUPLICATE_COLOR_SUBMISSION');
        }

        seenColors.add(savedPath.color);

        if (savedPath.path.length === 0) {
            continue;
        }

        const completed = validatePathForPair({
            gridX,
            gridY,
            pair,
            path: savedPath.path,
            occupiedCells,
        });

        if (completed) {
            completedColors.push(savedPath.color);
        }
    }

    if (requireFullCoverage) {
        if (completedColors.length !== pairs.length) {
            throw new BadRequestException('BLOCK_FILL_INCOMPLETE_SUBMISSION');
        }

        if (occupiedCells.size !== gridX * gridY) {
            throw new BadRequestException('BLOCK_FILL_GRID_NOT_FILLED');
        }
    }

    return {
        completedColors,
        occupiedCount: occupiedCells.size,
    };
}

/**
 * Validates that a submitted block-fill solution is fully complete.
 * @param {SnapshotValidationOptions} options - The solution validation options.
 * @returns {void} Nothing.
 */
export function validateCompletedBlockFillSolution(options: SnapshotValidationOptions): void {
    validateBlockFillSnapshot({
        ...options,
        requireFullCoverage: true,
    });
}

/**
 * Validates a single path against its pair endpoints and occupied cells.
 * @param {{ gridX: number; gridY: number; pair: BlockFillPairInput; path: GridPoint[]; occupiedCells: Map<string, string>; }} options - The path validation options.
 * @returns {boolean} Whether the path completes the pair by touching both endpoints correctly.
 */
function validatePathForPair(options: {
    gridX: number;
    gridY: number;
    pair: BlockFillPairInput;
    path: GridPoint[];
    occupiedCells: Map<string, string>;
}): boolean {
    const { gridX, gridY, pair, path, occupiedCells } = options;
    const normalizedPath = normalizePathDirection(path, pair);

    const localCells = new Set<string>();

    for (let index = 0; index < normalizedPath.length; index += 1) {
        const point = normalizedPath[index];
        if (!isPointInsideGrid(point, gridX, gridY)) {
            throw new BadRequestException('BLOCK_FILL_PATH_OUT_OF_BOUNDS');
        }

        if (index > 0 && !isAdjacent(normalizedPath[index - 1], point)) {
            throw new BadRequestException('BLOCK_FILL_NON_ADJACENT_STEP');
        }

        const key = pointKey(point.x, point.y);
        if (localCells.has(key)) {
            throw new BadRequestException('BLOCK_FILL_SELF_INTERSECTION');
        }

        if (occupiedCells.has(key)) {
            throw new BadRequestException('BLOCK_FILL_OVERLAPPING_PATH');
        }

        localCells.add(key);
        occupiedCells.set(key, pair.color);
    }

    const touchesBothEndpoints =
        pathTouchesEndpoint(normalizedPath, pair.start) &&
        pathTouchesEndpoint(normalizedPath, pair.end);

    if (!touchesBothEndpoints) {
        return false;
    }

    if (!endpointsMatch(normalizedPath, pair.start, pair.end)) {
        throw new BadRequestException('BLOCK_FILL_ENDPOINT_MISMATCH');
    }

    return true;
}

/**
 * Normalizes a path so endpoint checks can be evaluated from either direction.
 * @param {GridPoint[]} path - The raw path points.
 * @param {BlockFillPairInput} pair - The pair whose endpoints the path belongs to.
 * @returns {GridPoint[]} The normalized path direction.
 */
function normalizePathDirection(path: GridPoint[], pair: BlockFillPairInput): GridPoint[] {
    if (path.length === 0) {
        return path;
    }

    const startsAtOwnEndpoint = samePoint(path[0], pair.start) || samePoint(path[0], pair.end);
    if (startsAtOwnEndpoint) {
        return path;
    }

    const endsAtOwnEndpoint =
        samePoint(path[path.length - 1], pair.start) || samePoint(path[path.length - 1], pair.end);

    return endsAtOwnEndpoint ? [...path].reverse() : path;
}
