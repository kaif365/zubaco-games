import { ArrowPiece, Board, Level } from "./types";

export function buildBoard(level: Level): Board {
  const board: Board = Array.from({ length: level.gridSize }, () =>
    Array(level.gridSize).fill(null),
  );
  level.arrows.forEach((a, i) => {
    const piece: ArrowPiece = { ...a, id: `arrow-${i}` };
    board[a.row][a.col] = piece;
  });
  return board;
}

export function canMove(arrow: ArrowPiece, board: Board): boolean {
  const { row, col, direction } = arrow;
  const size = board.length;
  switch (direction) {
    case "up":
      for (let r = row - 1; r >= 0; r--) if (board[r][col]) return false;
      return true;
    case "down":
      for (let r = row + 1; r < size; r++) if (board[r][col]) return false;
      return true;
    case "left":
      for (let c = col - 1; c >= 0; c--) if (board[row][c]) return false;
      return true;
    case "right":
      for (let c = col + 1; c < size; c++) if (board[row][c]) return false;
      return true;
  }
}

export function removeArrow(id: string, board: Board): Board {
  return board.map((row) => row.map((cell) => (cell?.id === id ? null : cell)));
}

export function isWon(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell === null));
}
