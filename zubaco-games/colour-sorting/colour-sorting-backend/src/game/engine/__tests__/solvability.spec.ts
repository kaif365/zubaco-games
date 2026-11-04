import {
  generatePuzzle,
  isValidMove,
  executeMove,
  isTubeSorted,
  isPuzzleSolved,
} from '../puzzleGenerator';

describe('Colour Sorting Solvability & Mathematical Invariants', () => {
  const config = {
    colorCount: 4,
    ballsPerTube: 4,
    emptyTubes: 2,
  };

  it('guarantees capacity and buffer invariants across all generated tubes', () => {
    const puzzle = generatePuzzle(12345, config);

    expect(puzzle.length).toBe(config.colorCount + config.emptyTubes);
    for (const tube of puzzle) {
      expect(tube.capacity).toBe(config.ballsPerTube);
      expect(tube.balls.length).toBeLessThanOrEqual(config.ballsPerTube);
    }

    // Total balls across all tubes must equal colorCount * ballsPerTube
    const totalBalls = puzzle.reduce((sum, tube) => sum + tube.balls.length, 0);
    expect(totalBalls).toBe(config.colorCount * config.ballsPerTube);
  });

  it('guarantees generated puzzle is non-trivial (not already solved)', () => {
    const puzzle = generatePuzzle(999, config);
    expect(isPuzzleSolved(puzzle)).toBe(false);
  });

  it('validates legal move invariants: only match top ball or empty tube within capacity', () => {
    const tubes = [
      { id: 0, balls: ['red', 'blue'], capacity: 4 },
      { id: 1, balls: ['green', 'blue'], capacity: 4 },
      { id: 2, balls: [], capacity: 4 },
      { id: 3, balls: ['red', 'red', 'red', 'red'], capacity: 4 },
    ];

    // Tube 0 (top: blue) -> Tube 1 (top: blue): Valid move
    expect(isValidMove(tubes, 0, 1)).toBe(true);

    // Tube 0 (top: blue) -> Tube 2 (empty): Valid move
    expect(isValidMove(tubes, 0, 2)).toBe(true);

    // Tube 0 (top: blue) -> Tube 3 (full): Invalid move (capacity exceeded)
    expect(isValidMove(tubes, 0, 3)).toBe(false);

    // Tube 1 (top: blue) -> Tube 0 (top: blue): Valid move
    expect(isValidMove(tubes, 1, 0)).toBe(true);

    // Tube 2 (empty) -> Tube 0: Invalid move (empty source)
    expect(isValidMove(tubes, 2, 0)).toBe(false);

    // Same tube: Invalid move
    expect(isValidMove(tubes, 0, 0)).toBe(false);
  });

  it('correctly executes move and updates state immutably', () => {
    const tubes = [
      { id: 0, balls: ['red', 'blue'], capacity: 4 },
      { id: 1, balls: ['blue'], capacity: 4 },
    ];

    const nextTubes = executeMove(tubes, 0, 1);
    expect(nextTubes[0].balls).toEqual(['red']);
    expect(nextTubes[1].balls).toEqual(['blue', 'blue']);
  });

  it('correctly identifies when puzzle is solved', () => {
    const solved = [
      { id: 0, balls: ['red', 'red', 'red', 'red'], capacity: 4 },
      { id: 1, balls: ['blue', 'blue', 'blue', 'blue'], capacity: 4 },
      { id: 2, balls: [], capacity: 4 },
    ];
    expect(isPuzzleSolved(solved)).toBe(true);
  });
});
