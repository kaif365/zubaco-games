import { DIR_DELTA } from '@common/constants';

import type { InFlightArrow } from '../game-restate-state.types';

export interface MoveInput {
    x: number;
    y: number;
    clickedAt: Date;
}

export interface MoveResult extends MoveInput {
    success: boolean;
    removedArrowId: string | null; // GameSessionArrow.id
}

/**
 * Build cell map.
 *
 * @param {InFlightArrow[]} arrows - arrows value.
 *
 * @returns {Map<string, string>} The build cell map result.
 */
export function buildCellMap(arrows: InFlightArrow[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const arrow of arrows) {
        if (arrow.removedAt) {
            continue;
        }
        for (const wp of arrow.waypoints) {
            map.set(`${wp.x},${wp.y}`, arrow.id);
        }
    }
    return map;
}

/**
 * Check whether path clear.
 *
 * @param {{ x: number; y: number }} head - head value.
 * @param {number} headDirection - head direction value.
 * @param {number} gridX - grid x value.
 * @param {number} gridY - grid y value.
 * @param {Map<string, string>} cellMap - cell map value.
 *
 * @returns {boolean} Whether the condition is met.
 */
export function isPathClear(
    head: { x: number; y: number },
    headDirection: number,
    gridX: number,
    gridY: number,
    cellMap: Map<string, string>,
): boolean {
    const delta = DIR_DELTA[headDirection];
    if (!delta) {
        return false;
    }
    let x = head.x + delta.dx;
    let y = head.y + delta.dy;
    while (x >= 0 && x < gridX && y >= 0 && y < gridY) {
        if (cellMap.has(`${x},${y}`)) {
            return false;
        }
        x += delta.dx;
        y += delta.dy;
    }
    return true;
}

/**
 * Handle replay moves.
 *
 * @param {MoveInput[]} moves - moves value.
 * @param {InFlightArrow[]} arrows - arrows value.
 * @param {number} gridX - grid x value.
 * @param {number} gridY - grid y value.
 *
 * @returns {MoveResult[]} The replay moves result.
 */
export function replayMoves(
    moves: MoveInput[],
    arrows: InFlightArrow[],
    gridX: number,
    gridY: number,
): MoveResult[] {
    const arrowMap = new Map(arrows.map((a) => [a.id, a]));
    const cellMap = buildCellMap(arrows);
    const results: MoveResult[] = [];

    for (const move of moves) {
        const arrowId = cellMap.get(`${move.x},${move.y}`);

        if (!arrowId) {
            results.push({ ...move, success: false, removedArrowId: null });
            continue;
        }

        const arrow = arrowMap.get(arrowId)!;
        if (arrow.removedAt) {
            results.push({ ...move, success: false, removedArrowId: null });
            continue;
        }

        const head = arrow.waypoints[arrow.waypoints.length - 1];
        if (!isPathClear(head, arrow.headDirection, gridX, gridY, cellMap)) {
            results.push({ ...move, success: false, removedArrowId: null });
            continue;
        }

        // Remove arrow from working state
        arrow.removedAt = move.clickedAt.toISOString();
        for (const wp of arrow.waypoints) {
            cellMap.delete(`${wp.x},${wp.y}`);
        }

        results.push({ ...move, success: true, removedArrowId: arrowId });
    }

    return results;
}
