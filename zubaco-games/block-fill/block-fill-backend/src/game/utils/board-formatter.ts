import type { BlockFillBoardShape } from '@common/utils/block-fill-board.util';
import { formatSharedBoardDefinition } from '@common/utils/block-fill-board.util';

import type { GridPoint } from './block-fill-helpers';

export interface FormattedBoard {
    sessionBoardId: string;
    boardId: string;
    levelId: string;
    name: string;
    gridRow: number;
    gridCol: number;
    nodes: BlockFillBoardShape['nodes'];
    version: number;
    paths: Array<{
        color: string;
        path: Array<{ row: number; col: number }>;
        completed: boolean;
    }>;
}

export function formatBlockFillBoard(options: {
    sessionBoardId: string;
    board: {
        id: string;
        levelId: string;
    };
    boardShape: BlockFillBoardShape;
    version: number;
    paths: Array<{ color: string; path: GridPoint[]; completed: boolean }>;
}): FormattedBoard {
    const { sessionBoardId, board, boardShape, version, paths } = options;
    const sharedBoard = formatSharedBoardDefinition({
        levelId: board.levelId,
        boardShape,
    });

    return {
        sessionBoardId,
        boardId: board.id,
        ...sharedBoard,
        version,
        paths: paths.map((p) => ({
            color: p.color,
            path: p.path.map((point) => ({ row: point.y, col: point.x })),
            completed: Boolean(p.completed),
        })),
    };
}
