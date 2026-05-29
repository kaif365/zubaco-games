import { describe, expect, it } from 'vitest';
import { flowLevelPacks } from '@/features/flow-puzzle/data/mockLevels';

describe('mock flow levels', () => {
  it('loads easy, medium, and hard packs from separate level folders', () => {
    expect(flowLevelPacks.map((pack) => pack.id)).toEqual([
      'difficulty-easy',
      'difficulty-medium',
      'difficulty-hard',
    ]);
    expect(flowLevelPacks.every((pack) => pack.levels.length > 0)).toBe(true);
  });

  it('do not ship unintended enabled-cell dead zones', () => {
    for (const pack of flowLevelPacks) {
      for (const level of pack.levels) {
        expect(level.enabledCells ?? []).toHaveLength(0);
      }
    }
  });

  it('normalize compact nodes into playable endpoint pairs', () => {
    for (const pack of flowLevelPacks) {
      for (const level of pack.levels) {
        expect(level.nodes.length).toBeGreaterThan(0);
        for (const node of level.nodes) {
          expect(node.colorId).toBeTruthy();
          expect(node.endpoints).toHaveLength(2);
        }
      }
    }
  });
});
