import {
  EMPTY_TILE_SENTINEL,
  getBoardPosition,
  getEmptyIndex,
  areIndicesAdjacent,
  moveTile,
  isSolvedBoard,
} from '../lib/sliding-puzzle/board';

describe('board logic', () => {
  describe('getBoardPosition', () => {
    it('calculates row and column correctly', () => {
      expect(getBoardPosition(4, 3)).toEqual({ row: 1, column: 1 });
      expect(getBoardPosition(0, 3)).toEqual({ row: 0, column: 0 });
    });
  });

  describe('getEmptyIndex', () => {
    it('finds the sentinel index', () => {
      expect(getEmptyIndex([0, EMPTY_TILE_SENTINEL, 1])).toBe(1);
      expect(getEmptyIndex([1, 2, 3])).toBe(-1);
    });
  });

  describe('areIndicesAdjacent', () => {
    it('returns true for adjacent indices', () => {
      expect(areIndicesAdjacent(0, 1, 3)).toBe(true);
      expect(areIndicesAdjacent(0, 3, 3)).toBe(true);
    });

    it('returns false for diagonal or far indices', () => {
      expect(areIndicesAdjacent(0, 4, 3)).toBe(false);
      expect(areIndicesAdjacent(0, 2, 3)).toBe(false);
    });
  });

  describe('moveTile', () => {
    it('swaps tile with empty slot if valid', () => {
      const board = [0, 1, 2, 3, 4, 5, 6, 7, EMPTY_TILE_SENTINEL];
      const result = moveTile(board, 7, 3);
      expect(result.moved).toBe(true);
      expect(result.board[7]).toBe(EMPTY_TILE_SENTINEL);
      expect(result.board[8]).toBe(7);
    });

    it('does not move if not adjacent', () => {
      const board = [0, 1, 2, 3, 4, 5, 6, 7, EMPTY_TILE_SENTINEL];
      const result = moveTile(board, 0, 3);
      expect(result.moved).toBe(false);
      expect(result.board).toEqual(board);
    });
  });

  describe('isSolvedBoard', () => {
    it('returns true for solved board', () => {
      expect(isSolvedBoard([0, 1, 2, EMPTY_TILE_SENTINEL])).toBe(true);
    });

    it('returns false for unsolved board', () => {
      expect(isSolvedBoard([1, 0, 2, EMPTY_TILE_SENTINEL])).toBe(false);
    });
  });
});
