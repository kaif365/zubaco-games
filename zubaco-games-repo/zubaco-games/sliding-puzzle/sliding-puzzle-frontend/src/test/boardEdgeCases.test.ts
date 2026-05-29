import { getEmptyIndex, isSolvedBoard, moveTile } from '../lib/sliding-puzzle/board';

describe('board logic edge cases', () => {
  it('handles getEmptyIndex with no -1', () => {
    expect(getEmptyIndex([0, 1, 2])).toBe(-1);
  });

  it('handles isSolvedBoard with wrong length', () => {
    expect(isSolvedBoard([0])).toBe(false);
  });

  it('handles moveTile with out of bounds', () => {
    const board = [0, 1, 2, -1];
    expect(moveTile(board, 5, 2)).toEqual({ moved: false, board });
    expect(moveTile(board, -1, 2)).toEqual({ moved: false, board });
  });

  it('handles moveTile with same index as empty', () => {
    const board = [0, 1, 2, -1];
    expect(moveTile(board, 3, 2)).toEqual({ moved: false, board });
  });
});
