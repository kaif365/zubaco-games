import { describe, expect, it } from 'vitest';
import { generateDifficultyLevel } from '@/features/flow-puzzle/utils/levelGenerator';

describe('levelGenerator', () => {
  it('generates compact easy JSON shape', () => {
    const level = generateDifficultyLevel('easy', 4);
    expect(level.name).toMatch(/^Easy /);
    expect(level.gridRow).toBeGreaterThan(1);
    expect(level.gridCol).toBeGreaterThan(1);
    expect(level.nodes.length).toBeGreaterThan(0);
    expect(level.nodes[0]?.colorCode).toBeTruthy();
    expect(level.nodes[0]?.points.length).toBe(2);
  });

  it('generates compact medium JSON shape', () => {
    const level = generateDifficultyLevel('medium', 4);
    expect(level.name).toMatch(/^Medium /);
    expect(level.gridRow).toBeGreaterThan(1);
    expect(level.gridCol).toBeGreaterThan(1);
    expect(level.nodes.length).toBeGreaterThan(0);
    expect(level.nodes[0]?.points.length).toBe(2);
  });

  it('generates compact hard JSON shape', () => {
    const level = generateDifficultyLevel('hard', 4);
    expect(level.name).toMatch(/^Hard /);
    expect(level.gridRow).toBeGreaterThan(1);
    expect(level.gridCol).toBeGreaterThan(1);
    expect(level.nodes.length).toBeGreaterThan(0);
    expect(level.nodes[0]?.points.length).toBe(2);
  });

  it('supports large grids (beyond 14×14) for hard difficulty', () => {
    const rows = 22;
    const cols = 18;
    const level = generateDifficultyLevel('hard', 1, { rows, cols });
    expect(level.gridRow).toBe(rows);
    expect(level.gridCol).toBe(cols);
    expect(level.nodes.length).toBeGreaterThan(1);
    expect(level.nodes.length).toBeLessThanOrEqual(10);
    for (const node of level.nodes) {
      expect(node.points).toHaveLength(2);
    }
  });
});
