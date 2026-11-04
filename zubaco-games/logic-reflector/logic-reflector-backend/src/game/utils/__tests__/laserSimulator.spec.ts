import {
  simulateLasers,
  isSolved,
  SimCell,
  SimBlock,
} from '../laser-simulator';

describe('Logic Reflector — Laser Simulator & Optical Physics Audit', () => {
  const UP = 0;
  const DOWN = 1;
  const LEFT = 2;
  const RIGHT = 3;

  const REFLECT_BLOCK = 1;
  const MIRROR_FWD = 2; // / mirror
  const MIRROR_BWD = 3; // \ mirror
  const SPLITTER = 4;
  const BLOCKER = 5;

  const CELL_EMITTER = 1;
  const CELL_RECEIVER = 2;
  const CELL_WALL = 3;

  it('correctly simulates direct straight beam from emitter to receiver', () => {
    const cells: SimCell[] = [
      { row: 0, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
      { row: 0, col: 4, cellType: CELL_RECEIVER, orientation: 0 },
    ];
    const blocks: SimBlock[] = [];

    const result = simulateLasers(5, 5, cells, blocks);
    expect(result.totalReceivers).toBe(1);
    expect(result.hitReceivers.has('0,4')).toBe(true);
    expect(isSolved(5, 5, cells, blocks)).toBe(true);
  });

  it('blocks straight laser if wall is present along the path', () => {
    const cells: SimCell[] = [
      { row: 0, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
      { row: 0, col: 2, cellType: CELL_WALL, orientation: 0 },
      { row: 0, col: 4, cellType: CELL_RECEIVER, orientation: 0 },
    ];
    const blocks: SimBlock[] = [];

    const result = simulateLasers(5, 5, cells, blocks);
    expect(result.hitReceivers.has('0,4')).toBe(false);
    expect(isSolved(5, 5, cells, blocks)).toBe(false);
  });

  describe('Forward Mirror (/) Reflection Angles', () => {
    it('redirects RIGHT beam to UP', () => {
      // Emitter at (2,0) facing RIGHT, mirror at (2,2), target at (0,2)
      const cells: SimCell[] = [
        { row: 2, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
        { row: 0, col: 2, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 2, col: 2, blockType: MIRROR_FWD, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.hitReceivers.has('0,2')).toBe(true);
      expect(isSolved(5, 5, cells, blocks)).toBe(true);
    });

    it('redirects DOWN beam to LEFT', () => {
      // Emitter at (0,4) facing DOWN, mirror at (2,4), target at (2,1)
      const cells: SimCell[] = [
        { row: 0, col: 4, cellType: CELL_EMITTER, orientation: DOWN },
        { row: 2, col: 1, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 2, col: 4, blockType: MIRROR_FWD, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.hitReceivers.has('2,1')).toBe(true);
      expect(isSolved(5, 5, cells, blocks)).toBe(true);
    });

    it('redirects UP beam to RIGHT', () => {
      // Emitter at (4,2) facing UP, mirror at (2,2), target at (2,4)
      const cells: SimCell[] = [
        { row: 4, col: 2, cellType: CELL_EMITTER, orientation: UP },
        { row: 2, col: 4, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 2, col: 2, blockType: MIRROR_FWD, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.hitReceivers.has('2,4')).toBe(true);
      expect(isSolved(5, 5, cells, blocks)).toBe(true);
    });
  });

  describe('Backward Mirror (\\) Reflection Angles', () => {
    it('redirects RIGHT beam to DOWN', () => {
      // Emitter at (0,0) facing RIGHT, mirror at (0,2), target at (3,2)
      const cells: SimCell[] = [
        { row: 0, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
        { row: 3, col: 2, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 0, col: 2, blockType: MIRROR_BWD, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.hitReceivers.has('3,2')).toBe(true);
      expect(isSolved(5, 5, cells, blocks)).toBe(true);
    });

    it('redirects UP beam to LEFT', () => {
      // Emitter at (4,3) facing UP, mirror at (1,3), target at (1,0)
      const cells: SimCell[] = [
        { row: 4, col: 3, cellType: CELL_EMITTER, orientation: UP },
        { row: 1, col: 0, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 1, col: 3, blockType: MIRROR_BWD, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.hitReceivers.has('1,0')).toBe(true);
      expect(isSolved(5, 5, cells, blocks)).toBe(true);
    });
  });

  describe('Retroreflector (180° Inversion)', () => {
    it('inverts beam 180 degrees and redirects through mirror to target', () => {
      // Emitter at (0,0) fires RIGHT
      // Mirror \ at (0,2) redirects DOWN
      // Retroreflector at (2,2) inverts UP
      // Mirror \ at (0,2) redirects returning beam LEFT to target at (0,1)
      const cells: SimCell[] = [
        { row: 0, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
        { row: 0, col: 1, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 0, col: 2, blockType: MIRROR_BWD, orientation: 0 },
        { row: 2, col: 2, blockType: REFLECT_BLOCK, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.hitReceivers.has('0,1')).toBe(true);
      expect(isSolved(5, 5, cells, blocks)).toBe(true);
    });
  });

  describe('Splitter Optical Behavior', () => {
    it('splits a RIGHT beam into UP and DOWN to hit two distinct targets', () => {
      const cells: SimCell[] = [
        { row: 2, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
        { row: 0, col: 2, cellType: CELL_RECEIVER, orientation: 0 },
        { row: 4, col: 2, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 2, col: 2, blockType: SPLITTER, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.totalReceivers).toBe(2);
      expect(result.hitReceivers.has('0,2')).toBe(true);
      expect(result.hitReceivers.has('4,2')).toBe(true);
      expect(isSolved(5, 5, cells, blocks)).toBe(true);
    });

    it('requires all receivers to be hit for puzzle to be marked solved', () => {
      // 2 receivers, but only 1 is struck
      const cells: SimCell[] = [
        { row: 2, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
        { row: 2, col: 4, cellType: CELL_RECEIVER, orientation: 0 },
        { row: 0, col: 0, cellType: CELL_RECEIVER, orientation: 0 }, // Unreachable
      ];
      const blocks: SimBlock[] = [];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.totalReceivers).toBe(2);
      expect(result.hitReceivers.size).toBe(1);
      expect(isSolved(5, 5, cells, blocks)).toBe(false);
    });
  });

  describe('Blocker / Absorber', () => {
    it('absorbs laser beam and prevents it from reaching target', () => {
      const cells: SimCell[] = [
        { row: 0, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
        { row: 0, col: 4, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 0, col: 2, blockType: BLOCKER, orientation: 0 },
      ];

      const result = simulateLasers(5, 5, cells, blocks);
      expect(result.hitReceivers.has('0,4')).toBe(false);
      expect(isSolved(5, 5, cells, blocks)).toBe(false);
    });
  });

  describe('Endless Mirror Loop Cycle Avoidance', () => {
    it('safely terminates ray simulation when mirrors create an infinite loop', () => {
      // 4 mirrors forming a closed loop:
      // (1,1) [MIRROR_FWD] / -> right to (1,3)
      // (1,3) [MIRROR_BWD] \ -> down to (3,3)
      // (3,3) [MIRROR_FWD] / -> left to (3,1)
      // (3,1) [MIRROR_BWD] \ -> up to (1,1)
      const cells: SimCell[] = [
        { row: 1, col: 0, cellType: CELL_EMITTER, orientation: RIGHT },
        { row: 0, col: 4, cellType: CELL_RECEIVER, orientation: 0 },
      ];
      const blocks: SimBlock[] = [
        { row: 1, col: 1, blockType: MIRROR_FWD, orientation: 0 },
        { row: 1, col: 3, blockType: MIRROR_BWD, orientation: 0 },
        { row: 3, col: 3, blockType: MIRROR_FWD, orientation: 0 },
        { row: 3, col: 1, blockType: MIRROR_BWD, orientation: 0 },
      ];

      // Must complete promptly without freezing or stack overflowing
      const startTime = Date.now();
      const result = simulateLasers(5, 5, cells, blocks);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(result.hitReceivers.has('0,4')).toBe(false);
      expect(isSolved(5, 5, cells, blocks)).toBe(false);
    });
  });
});
