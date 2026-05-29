export const EMPTY_TILE_SENTINEL = -1;

export function getBoardPosition(index: number, columns: number) {
  return {
    row: Math.floor(index / columns),
    column: index % columns,
  };
}

export function getEmptyIndex(board: number[]) {
  return board.indexOf(EMPTY_TILE_SENTINEL);
}

export function areIndicesAdjacent(left: number, right: number, columns: number) {
  const a = getBoardPosition(left, columns);
  const b = getBoardPosition(right, columns);
  return Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1;
}

/**
 * Attempt to move the tile at `index` into the blank space.
 * Returns the new board if successful, or the original if not adjacent.
 */
export function moveTile(board: number[], index: number, columns: number) {
  const emptyIndex = getEmptyIndex(board);
  if (
    index < 0 ||
    index >= board.length ||
    emptyIndex === -1 ||
    !areIndicesAdjacent(index, emptyIndex, columns)
  ) {
    return { moved: false, board };
  }

  const nextBoard = [...board];
  [nextBoard[index], nextBoard[emptyIndex]] = [nextBoard[emptyIndex], nextBoard[index]];
  return { moved: true, board: nextBoard, emptyIndex: index };
}

/**
 * Client-side solved check matching the server convention:
 * pieces[i] === i for i in [0..n-2], pieces[n-1] === -1
 */
export function isSolvedBoard(pieces: number[]) {
  const n = pieces.length;
  for (let i = 0; i < n - 1; i++) {
    if (pieces[i] !== i) return false;
  }
  return pieces[n - 1] === EMPTY_TILE_SENTINEL;
}
