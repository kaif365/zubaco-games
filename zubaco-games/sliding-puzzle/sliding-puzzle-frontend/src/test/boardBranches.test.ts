import { areIndicesAdjacent, moveTile, getEmptyIndex } from '../lib/sliding-puzzle/board';

describe('Board Logic Branches', () => {
  it('covers areIndicesAdjacent bounds checking', () => {
    expect(areIndicesAdjacent(-1, 0, 3)).toBe(false);
    expect(areIndicesAdjacent(0, 9, 3)).toBe(false);
    expect(areIndicesAdjacent(0, 1, 3)).toBe(true);
  });

  it('covers moveTile for invalid index', () => {
    const board = [1, 2, 3, 4, 5, 6, 7, 8, -1];
    const { moved } = moveTile(board, 10, 3);
    expect(moved).toBe(false);
  });

  it('covers getEmptyIndex with no sentinel', () => {
    expect(getEmptyIndex([0, 1, 2])).toBe(-1);
  });
});
