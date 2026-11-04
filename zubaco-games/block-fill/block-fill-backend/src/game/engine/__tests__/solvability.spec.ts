import { hasBlockFillSolution } from '../../utils/block-fill-solver';
import { validateBlockFillPairs, validateBlockFillSnapshot } from '../../utils/block-fill-validator';

describe('Block Fill Mathematical Solvability & Invariant Verification', () => {
  it('correctly verifies a solvable 2x2 grid with 2 pairs covering 100% of cells (Hamiltonian guarantee)', () => {
    // 2x2 grid:
    // (0,0) Red Start -> (0,1) Red End
    // (1,0) Blue Start -> (1,1) Blue End
    const pairs = [
      { color: 'red', start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
      { color: 'blue', start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
    ];

    expect(hasBlockFillSolution({ gridX: 2, gridY: 2, pairs })).toBe(true);
  });

  it('detects unsolvable configuration where endpoints collide or dead-end', () => {
    // Invalid pair configuration (overlapping endpoints)
    const invalidPairs = [
      { color: 'red', start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
      { color: 'blue', start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    ];

    expect(() => validateBlockFillPairs(2, 2, invalidPairs)).toThrow('BLOCK_FILL_DUPLICATE_ENDPOINT');
  });

  it('validates 100% full coverage snapshot without cell collision', () => {
    const pairs = [
      { color: 'red', start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
      { color: 'blue', start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
    ];

    const paths = [
      { color: 'red', path: [{ x: 0, y: 0 }, { x: 0, y: 1 }] },
      { color: 'blue', path: [{ x: 1, y: 0 }, { x: 1, y: 1 }] },
    ];

    const result = validateBlockFillSnapshot({
      gridX: 2,
      gridY: 2,
      pairs,
      paths,
      requireFullCoverage: true,
    });

    expect(result.completedColors).toEqual(['red', 'blue']);
    expect(result.occupiedCount).toBe(4);
  });

  it('rejects path intersecting another color path (deadlock prevention)', () => {
    const pairs = [
      { color: 'red', start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
      { color: 'blue', start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
    ];

    // Red crosses (0,1) which belongs to Blue endpoint
    const paths = [
      { color: 'red', path: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      { color: 'blue', path: [{ x: 1, y: 0 }, { x: 0, y: 1 }] },
    ];

    expect(() =>
      validateBlockFillSnapshot({
        gridX: 2,
        gridY: 2,
        pairs,
        paths,
      }),
    ).toThrow();
  });
});
