import type { InFlightBoard } from '../game-restate-state.types';

export interface BoardResponse {
    sessionBoardId: string;
    id: string;
    roundNumber: number;
    gridSize: { x: number; y: number };
    fullImageUrl: string;
    displayTime: number;
    enableNumbers: boolean;
    pieces: number[];
}

/**
 * Format an in-flight board as a client board response.
 *
 * @param {InFlightBoard} board - board state value.
 *
 * @returns {BoardResponse} The board response.
 */
export function formatBoardResponseFromState(board: InFlightBoard): BoardResponse {
    return {
        sessionBoardId: board.id,
        id: board.boardId,
        roundNumber: board.roundNumber,
        gridSize: { x: board.gridX, y: board.gridY },
        fullImageUrl: board.fullImageUrl,
        displayTime: board.displayTime,
        enableNumbers: board.enableNumbers,
        pieces: board.pieces,
    };
}
