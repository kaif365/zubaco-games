import {
  generateSolvedPuzzle,
  scramblePuzzle,
  rotateTile,
  validateSolution,
} from '../puzzle.engine';

describe('Infinity Loop Mathematical Solvability & Degree Matching', () => {
  it('generates a 100% valid closed topological loop (every port matched)', () => {
    const rows = 4;
    const cols = 4;
    const seed = 'test-seed-loop-1';

    const { grid } = generateSolvedPuzzle(rows, cols, seed);

    const validation = validateSolution(grid);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('scrambling breaks solved state and creates a solvable configuration', () => {
    const rows = 4;
    const cols = 4;
    const seed = 'test-seed-loop-2';

    const { grid } = generateSolvedPuzzle(rows, cols, seed);
    const { scrambledGrid, rotations } = scramblePuzzle(grid, seed);

    // Verify non-trivial rotation occurred
    const hasRotations = rotations.some((row) => row.some((r) => r > 0));
    expect(hasRotations).toBe(true);

    // Reconstruct solution by applying reverse rotations: (4 - r) % 4
    const reconstructedGrid: number[][] = [];
    for (let r = 0; r < rows; r++) {
      reconstructedGrid.push([]);
      for (let c = 0; c < cols; c++) {
        const revSteps = (4 - (rotations[r][c] % 4)) % 4;
        reconstructedGrid[r].push(rotateTile(scrambledGrid[r][c], revSteps));
      }
    }

    const reconstructedValidation = validateSolution(reconstructedGrid);
    expect(reconstructedValidation.valid).toBe(true);
    expect(reconstructedValidation.errors.length).toBe(0);
  });

  it('guarantees 4-cycle rotation invariance (rotating 4 times returns to original mask)', () => {
    const testMasks = [3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 19, 22, 25, 28];
    for (const mask of testMasks) {
      expect(rotateTile(mask, 4)).toBe(mask);
      expect(rotateTile(mask, 0)).toBe(mask);
      expect(rotateTile(mask, 8)).toBe(mask);
    }
  });
});
