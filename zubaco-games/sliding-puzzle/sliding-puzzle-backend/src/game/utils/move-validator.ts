export interface MoveInput {
    slot: number; // grid slot the user tapped
    clickedAt: Date;
    clientMoveId: string;
}

export interface MoveResult {
    clientMoveId: string;
    fromSlot: number;
    toSlot: number; // where the blank was (piece slides into this)
    pieceIndex: number; // which piece moved; -1 if invalid
    success: boolean;
    clickedAt: Date;
}

/**
 * Replay a sorted batch of moves against a mutable pieces array.
 *
 * A move is valid when:
 *   1. The tapped slot contains a non-blank piece.
 *   2. The tapped slot is orthogonally adjacent to the blank slot.
 *
 * On success the function mutates pieces in-place so subsequent moves in the
 * same batch see the updated board state.
 *
 * @param {MoveInput[]} moves - move values.
 * @param {number[]} pieces - piece values.
 * @param {number} gridX - grid x value.
 *
 * @returns {MoveResult[]} The replay moves result.
 */
export function replayMoves(
    moves: MoveInput[],
    pieces: number[], // mutated in-place
    gridX: number,
): MoveResult[] {
    const results: MoveResult[] = [];

    let blankSlot = pieces.indexOf(-1);

    for (const move of moves) {
        const { slot } = move;

        if (pieces[slot] === -1) {
            // Tapped the blank itself
            results.push({
                clientMoveId: move.clientMoveId,
                fromSlot: slot,
                toSlot: slot,
                pieceIndex: -1,
                success: false,
                clickedAt: move.clickedAt,
            });
            continue;
        }

        if (!isAdjacent(slot, blankSlot, gridX)) {
            results.push({
                clientMoveId: move.clientMoveId,
                fromSlot: slot,
                toSlot: blankSlot,
                pieceIndex: -1,
                success: false,
                clickedAt: move.clickedAt,
            });
            continue;
        }

        const pieceIndex = pieces[slot];
        const prevBlankSlot = blankSlot;
        pieces[blankSlot] = pieceIndex;
        pieces[slot] = -1;
        blankSlot = slot;

        results.push({
            clientMoveId: move.clientMoveId,
            fromSlot: slot,
            toSlot: prevBlankSlot,
            pieceIndex,
            success: true,
            clickedAt: move.clickedAt,
        });
    }

    return results;
}

/**
 * Check whether two slots are orthogonally adjacent.
 *
 * @param {number} slotA - slot a value.
 * @param {number} slotB - slot b value.
 * @param {number} gridX - grid x value.
 *
 * @returns {boolean} Whether the condition is met.
 */
function isAdjacent(slotA: number, slotB: number, gridX: number): boolean {
    const rowA = Math.floor(slotA / gridX);
    const colA = slotA % gridX;
    const rowB = Math.floor(slotB / gridX);
    const colB = slotB % gridX;
    return (
        (rowA === rowB && Math.abs(colA - colB) === 1) ||
        (colA === colB && Math.abs(rowA - rowB) === 1)
    );
}
