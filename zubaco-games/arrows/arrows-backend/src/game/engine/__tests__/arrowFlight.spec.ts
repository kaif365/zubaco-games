import { buildCellMap, isPathClear, replayMoves } from '../../utils/move-validator';

describe('Arrows Inhibitory Control & Unobstructed Flight Mechanics', () => {
  it('correctly maps waypoints to arrow IDs', () => {
    const arrows = [
      {
        id: 'arrow-1',
        headDirection: 1, // North
        waypoints: [
          { x: 2, y: 3 },
          { x: 2, y: 2 },
        ],
        removedAt: null,
      },
    ];

    const cellMap = buildCellMap(arrows as any);
    expect(cellMap.get('2,3')).toBe('arrow-1');
    expect(cellMap.get('2,2')).toBe('arrow-1');
    expect(cellMap.has('2,1')).toBe(false);
  });

  it('determines path is clear when no arrows obstruct trajectory to boundary', () => {
    // Grid 5x5. Arrow head at (2,1) moving North (dy = -1).
    // North path checks (2,0). If clear, isPathClear is true.
    const cellMap = new Map<string, string>();
    const head = { x: 2, y: 1 };
    const headDirection = 1; // North

    expect(isPathClear(head, headDirection, 5, 5, cellMap)).toBe(true);
  });

  it('detects blocked path when another arrow occupies line of sight', () => {
    const cellMap = new Map<string, string>();
    cellMap.set('2,0', 'arrow-blocking');

    const head = { x: 2, y: 1 };
    const headDirection = 1; // North

    expect(isPathClear(head, headDirection, 5, 5, cellMap)).toBe(false);
  });

  it('allows untangling move when flight path becomes clear after previous removal', () => {
    const arrows = [
      {
        id: 'arrow-1',
        headDirection: 1, // North, at (2,0)
        waypoints: [{ x: 2, y: 0 }],
        removedAt: null,
      },
      {
        id: 'arrow-2',
        headDirection: 1, // North, at (2,2) behind arrow-1
        waypoints: [{ x: 2, y: 2 }],
        removedAt: null,
      },
    ];

    const moves = [
      { x: 2, y: 0, clickedAt: new Date() }, // Remove arrow-1
      { x: 2, y: 2, clickedAt: new Date() }, // Now arrow-2 has clear path
    ];

    const results = replayMoves(moves, arrows as any, 5, 5);
    expect(results[0].success).toBe(true);
    expect(results[0].removedArrowId).toBe('arrow-1');
    expect(results[1].success).toBe(true);
    expect(results[1].removedArrowId).toBe('arrow-2');
  });
});
