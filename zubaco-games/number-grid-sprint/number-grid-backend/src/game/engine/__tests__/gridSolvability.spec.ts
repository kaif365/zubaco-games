import { generateGrid } from '../gridGenerator';
import { calculateScore, StageConfig } from '../scorer';
import { analyzeInputTiming } from '../timingAnalyzer';

describe('Number Grid Sprint — Solvability & Anti-Cheat Audit', () => {
  describe('Grid Generation Permutation Invariants', () => {
    it('produces exactly N*N unique numbers from 1 to N*N without duplicates', () => {
      const sizes = [3, 4, 5, 6];
      for (const size of sizes) {
        const total = size * size;
        const grid = generateGrid(12345, size);

        expect(grid.length).toBe(total);

        const values = new Set<number>();
        const positions = new Set<string>();

        for (const cell of grid) {
          expect(cell.row).toBeGreaterThanOrEqual(0);
          expect(cell.row).toBeLessThan(size);
          expect(cell.col).toBeGreaterThanOrEqual(0);
          expect(cell.col).toBeLessThan(size);
          expect(cell.value).toBeGreaterThanOrEqual(1);
          expect(cell.value).toBeLessThanOrEqual(total);

          values.add(cell.value);
          positions.add(`${cell.row}:${cell.col}`);
        }

        expect(values.size).toBe(total);
        expect(positions.size).toBe(total);
      }
    });

    it('guarantees deterministic output for the same seed and divergence for different seeds', () => {
      const gridA1 = generateGrid(99999, 5);
      const gridA2 = generateGrid(99999, 5);
      const gridB = generateGrid(88888, 5);

      expect(gridA1).toEqual(gridA2);

      const diffCount = gridA1.filter((cell, idx) => cell.value !== gridB[idx]?.value).length;
      expect(diffCount).toBeGreaterThan(15);
    });
  });

  describe('Scoring Calculation & Deduplication', () => {
    const config: StageConfig = {
      gridSize: 3,
      revealDurationMs: 1000,
      hideIntervalMs: 3000,
      timeLimitMs: 60000,
      pointsPerCorrect: 10,
      timeBonusMultiplier: 2,
    };

    it('awards full score for perfectly matching answers', () => {
      const grid = generateGrid(42, 3);
      const answers = grid.map((c, i) => ({
        row: c.row,
        col: c.col,
        value: c.value,
        timestamp: 1000 + i * 300,
      }));

      const result = calculateScore(answers, grid, 30000, config);
      expect(result.correctCells).toBe(9);
      expect(result.totalCells).toBe(9);
      expect(result.timeBonus).toBe(60); // (30000 / 1000) * 2
      expect(result.finalScore).toBe(9 * 10 + 60);
    });

    it('deduplicates duplicate clicks on the same coordinate', () => {
      const grid = generateGrid(42, 3);
      const firstCell = grid[0]!;
      const answers = [
        { row: firstCell.row, col: firstCell.col, value: firstCell.value, timestamp: 1000 },
        { row: firstCell.row, col: firstCell.col, value: firstCell.value, timestamp: 1200 },
      ];

      const result = calculateScore(answers, grid, 10000, config);
      expect(result.correctCells).toBe(1);
    });
  });

  describe('Anti-Cheat Timing Analysis', () => {
    it('accepts human reaction times above minimum threshold', () => {
      // Natural human reaction times: ~250ms - 400ms intervals
      const timestamps = [1000, 1320, 1680, 1950, 2300, 2650];
      const result = analyzeInputTiming(timestamps, { minAvgResponseMs: 100 });

      expect(result.isSuspicious).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.avgResponseMs).toBeGreaterThan(200);
    });

    it('flags superhuman bot reaction times (<100ms average)', () => {
      const timestamps = [1000, 1020, 1050, 1070, 1100, 1130];
      const result = analyzeInputTiming(timestamps, { minAvgResponseMs: 100 });

      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain('Average response time');
    });

    it('flags burst macro inputs (>60% under 50ms)', () => {
      // Alternating normal and immediate micro-bursts
      const timestamps = [1000, 1010, 1020, 1030, 1500, 1510, 1520];
      const result = analyzeInputTiming(timestamps, {
        minAvgResponseMs: 50,
        minSingleResponseMs: 50,
        maxSuspiciousPct: 0.6,
      });

      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain('below 50ms threshold');
    });
  });
});
