import { describe, expect, it } from 'vitest';
import { simulateLaser } from '@/game/laserEngine';
import { LEVELS } from '@/features/game/data/levels';
import { getLevelAvailableBlocks } from '@/features/game/utils/levelBlocks';
import type { PlacedBlock } from '@/types/logic-reflector';

describe('laserEngine', () => {
  it('keeps starter block positions in the level JSON', () => {
    expect(LEVELS[0]!.initialBlocks).toEqual([
      { id: 'lr-001-block-1', row: 3, col: 3, type: 'reflect-block' },
    ]);
    expect(LEVELS[0]!.availableBlocks).toBeUndefined();
    expect(getLevelAvailableBlocks(LEVELS[0]!)).toEqual([{ type: 'reflect-block', count: 1 }]);
  });

  it('reflects from a whole block face and lights a subgrid target', () => {
    const placed: PlacedBlock[] = [{ row: 1, col: 2, type: 'reflect-block' }];
    const result = simulateLaser(LEVELS[0]!, placed);

    expect(result.litTargetKeys.has('t1')).toBe(true);
    expect(result.arms[0]?.points[1]?.x).toBeCloseTo(2.08);
    expect(result.arms[0]?.points[1]?.y).toBeCloseTo(1.5);
  });

  it('supports multi-bounce block reflections', () => {
    const placed: PlacedBlock[] = [
      { row: 2, col: 2, type: 'reflect-block' },
      { row: 1, col: 0, type: 'reflect-block' },
    ];
    const result = simulateLaser(LEVELS[1]!, placed);

    expect(result.litTargetKeys.has('t1')).toBe(true);
    expect(result.arms[0]?.points.length).toBeGreaterThanOrEqual(4);
  });

  it('lets the beam continue after illuminating a target', () => {
    const placed: PlacedBlock[] = [{ row: 1, col: 2, type: 'reflect-block' }];
    const result = simulateLaser(LEVELS[2]!, placed);

    expect(result.litTargetKeys.has('t1')).toBe(true);
    expect(result.litTargetKeys.has('t2')).toBe(true);
  });
});
