import { describe, expect, it } from 'vitest';
import {
  beginPathDraw,
  calculateScore,
  createFlowSession,
  dragPathToCell,
  endPathDraw,
  getBoardStats,
  isCellEnabled,
} from '@/features/flow-puzzle/engine/flowEngine';
import type { FlowPuzzleLevel } from '@/features/flow-puzzle/types';

const testLevel: FlowPuzzleLevel = {
  schemaVersion: 1,
  id: 'test-level',
  slug: 'test-level',
  packId: 'test-pack',
  worldId: 'test-world',
  order: 1,
  name: 'Test Level',
  description: 'Minimal board for engine coverage.',
  gridSize: 2,
  timeLimitSec: 60,
  difficulty: 'easy',
  theme: {
    name: 'Test',
    boardGradient: ['#000000', '#111111'],
    accent: '#ffffff',
    backgroundGlow: 'rgba(255,255,255,0.3)',
  },
  nodes: [
    {
      id: 'red',
      colorId: 'red',
      colorHex: '#ff0000',
      endpoints: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    },
    {
      id: 'blue',
      colorId: 'blue',
      colorHex: '#0000ff',
      endpoints: [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ],
    },
  ],
  objectives: {
    requireFullCoverage: true,
  },
  metadata: {
    version: 1,
  },
};

describe('flowEngine', () => {
  it('connects pairs and marks the puzzle solved when all required cells are covered', () => {
    let session = createFlowSession(testLevel);

    session = beginPathDraw(session, testLevel, { row: 0, col: 0 });
    session = dragPathToCell(session, testLevel, { row: 0, col: 1 });
    session = endPathDraw(session, testLevel);

    session = beginPathDraw(session, testLevel, { row: 1, col: 0 });
    session = dragPathToCell(session, testLevel, { row: 1, col: 1 });
    session = endPathDraw(session, testLevel);

    expect(session.isSolved).toBe(true);
    expect(session.moveCount).toBe(2);

    const stats = getBoardStats(testLevel, session);
    expect(stats.coveragePercent).toBe(100);
    expect(stats.completedPairs).toBe(2);
  });

  it('does not erase the whole stroke when swiping onto the starting dot from the far end', () => {
    const singleRedWide: FlowPuzzleLevel = {
      ...testLevel,
      gridSize: 5,
      nodes: [
        {
          id: 'red',
          colorId: 'red',
          colorHex: '#ff0000',
          endpoints: [
            { row: 0, col: 0 },
            { row: 0, col: 4 },
          ],
        },
      ],
    };

    let session = createFlowSession(singleRedWide);
    session = beginPathDraw(session, singleRedWide, { row: 0, col: 0 });
    session = dragPathToCell(session, singleRedWide, { row: 1, col: 0 });
    session = dragPathToCell(session, singleRedWide, { row: 1, col: 1 });
    session = dragPathToCell(session, singleRedWide, { row: 0, col: 1 });
    expect(session.paths.red).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 0, col: 1 },
    ]);

    const before = session.paths.red;
    session = dragPathToCell(session, singleRedWide, { row: 0, col: 0 });
    expect(session.paths.red).toEqual(before);

    session = dragPathToCell(session, singleRedWide, { row: 1, col: 1 });
    session = dragPathToCell(session, singleRedWide, { row: 1, col: 0 });
    expect(session.paths.red).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('cannot pass through or extend beyond the opposite dot of the same colour', () => {
    /** Corners analogous to screenshot: opposite dot sits before the logical “exit” corridor. */
    const cornerLevel: FlowPuzzleLevel = {
      ...testLevel,
      gridSize: 5,
      nodes: [
        {
          id: 'pink',
          colorId: 'pink',
          colorHex: '#ff66cc',
          endpoints: [
            { row: 0, col: 4 },
            { row: 4, col: 2 },
          ],
        },
      ],
    };

    let session = createFlowSession(cornerLevel);
    session = beginPathDraw(session, cornerLevel, { row: 0, col: 4 });

    session = dragPathToCell(session, cornerLevel, { row: 1, col: 4 });
    session = dragPathToCell(session, cornerLevel, { row: 2, col: 4 });
    session = dragPathToCell(session, cornerLevel, { row: 3, col: 4 });
    session = dragPathToCell(session, cornerLevel, { row: 4, col: 4 });
    session = dragPathToCell(session, cornerLevel, { row: 4, col: 3 });
    session = dragPathToCell(session, cornerLevel, { row: 4, col: 2 });
    expect(session.paths.pink?.[session.paths.pink.length - 1]).toEqual({ row: 4, col: 2 });

    const beforeIllegal = structuredClone(session);
    session = dragPathToCell(session, cornerLevel, { row: 4, col: 1 });
    expect(session.paths.pink).toEqual(beforeIllegal.paths.pink);
  });

  it('prevents drawing onto another color path and supports backtracking', () => {
    let session = createFlowSession(testLevel);

    session = beginPathDraw(session, testLevel, { row: 0, col: 0 });
    session = dragPathToCell(session, testLevel, { row: 0, col: 1 });
    session = endPathDraw(session, testLevel);

    session = beginPathDraw(session, testLevel, { row: 1, col: 0 });
    session = dragPathToCell(session, testLevel, { row: 0, col: 0 });
    expect(session.paths.blue).toEqual([{ row: 1, col: 0 }]);

    session = dragPathToCell(session, testLevel, { row: 1, col: 1 });
    session = dragPathToCell(session, testLevel, { row: 1, col: 0 });
    expect(session.paths.blue).toEqual([{ row: 1, col: 0 }]);
  });

  it('respects blocked and enabled cell constraints and trims an existing path when re-entered', () => {
    const constrainedLevel: FlowPuzzleLevel = {
      ...testLevel,
      gridSize: 3,
      nodes: [
        {
          id: 'red',
          colorId: 'red',
          colorHex: '#ff0000',
          endpoints: [
            { row: 0, col: 0 },
            { row: 2, col: 2 },
          ],
        },
      ],
      blockedCells: [{ row: 1, col: 1 }],
      enabledCells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ],
    };

    expect(isCellEnabled(constrainedLevel, { row: 1, col: 1 })).toBe(false);
    expect(isCellEnabled(constrainedLevel, { row: 1, col: 0 })).toBe(false);
    expect(isCellEnabled(constrainedLevel, { row: 1, col: 2 })).toBe(true);

    let session = createFlowSession(constrainedLevel);
    session = beginPathDraw(session, constrainedLevel, { row: 0, col: 0 });
    session = dragPathToCell(session, constrainedLevel, { row: 0, col: 1 });
    session = dragPathToCell(session, constrainedLevel, { row: 0, col: 2 });
    session = dragPathToCell(session, constrainedLevel, { row: 1, col: 2 });
    session = dragPathToCell(session, constrainedLevel, { row: 2, col: 2 });
    session = endPathDraw(session, constrainedLevel);

    session = beginPathDraw(session, constrainedLevel, { row: 0, col: 1 });
    expect(session.paths.red).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('resets an unfinished drag when the player releases before connecting the pair', () => {
    const incompleteLevel: FlowPuzzleLevel = {
      ...testLevel,
      gridSize: 3,
      nodes: [
        {
          id: 'red',
          colorId: 'red',
          colorHex: '#ff0000',
          endpoints: [
            { row: 0, col: 0 },
            { row: 0, col: 2 },
          ],
        },
      ],
    };
    let session = createFlowSession(incompleteLevel);

    session = beginPathDraw(session, incompleteLevel, { row: 0, col: 0 });
    session = dragPathToCell(session, incompleteLevel, { row: 1, col: 0 });
    expect(session.paths.red).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);

    session = endPathDraw(session, incompleteLevel);

    expect(session.paths.red).toEqual([]);
    expect(session.moveCount).toBe(0);
    expect(session.isSolved).toBe(false);
  });

  it('resets a completed color path back to the tapped endpoint when a dot is clicked', () => {
    let session = createFlowSession(testLevel);

    session = beginPathDraw(session, testLevel, { row: 0, col: 0 });
    session = dragPathToCell(session, testLevel, { row: 0, col: 1 });
    session = endPathDraw(session, testLevel);
    expect(session.paths.red).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    session = beginPathDraw(session, testLevel, { row: 0, col: 1 });

    expect(session.paths.red).toEqual([{ row: 0, col: 1 }]);
    expect(session.activePath?.cells).toEqual([{ row: 0, col: 1 }]);
  });

  it('clears a completed path when the user taps an endpoint and releases without dragging', () => {
    let session = createFlowSession(testLevel);

    session = beginPathDraw(session, testLevel, { row: 0, col: 0 });
    session = dragPathToCell(session, testLevel, { row: 0, col: 1 });
    session = endPathDraw(session, testLevel);
    expect(session.paths.red).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    session = beginPathDraw(session, testLevel, { row: 0, col: 0 });
    session = endPathDraw(session, testLevel);

    expect(session.paths.red).toEqual([]);
    expect(session.moveCount).toBe(1);
  });

  it('calculates score from time limit minus elapsed seconds', () => {
    expect(calculateScore(120, 14_900)).toBe(106);
    expect(calculateScore(10, 25_000)).toBe(0);
  });
});
