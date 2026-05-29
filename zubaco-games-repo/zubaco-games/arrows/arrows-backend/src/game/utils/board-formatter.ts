import { DIR_TO_STRING } from '@common/constants';

interface Waypoint {
    x: number;
    y: number;
}

interface FormattedArrow {
    waypoints: Waypoint[];
    headDirection: string; // 'up' | 'down' | 'left' | 'right'
    color: number;
}

export interface FormattedBoard {
    id: string;
    name: string | null;
    gridSize: { x: number; y: number };
    arrows: FormattedArrow[];
}

interface BoardRow {
    id: string;
    name: string | null;
    gridX: number;
    gridY: number;
}

interface ArrowRow {
    color: number;
    headDirection: number;
    waypoints: unknown;
    sortOrder: number;
}

/**
 * Format board.
 *
 * @param {BoardRow} board - board value.
 * @param {ArrowRow[]} arrows - arrows value.
 *
 * @returns {FormattedBoard} The format board result.
 */
export function formatBoard(board: BoardRow, arrows: ArrowRow[]): FormattedBoard {
    const sorted = [...arrows].sort((a, b) => a.sortOrder - b.sortOrder);

    return {
        id: board.id,
        name: board.name,
        gridSize: { x: board.gridX, y: board.gridY },
        arrows: sorted.map((a) => ({
            waypoints: a.waypoints as Waypoint[],
            headDirection: DIR_TO_STRING[a.headDirection] ?? 'up',
            color: a.color,
        })),
    };
}
