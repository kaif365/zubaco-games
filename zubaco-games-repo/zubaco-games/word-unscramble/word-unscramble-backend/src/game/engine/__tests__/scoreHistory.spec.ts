import { computePlayerStats } from '../scoreHistory';
import type { ScoreRecord } from '../scoreHistory';

describe('ScoreHistory', () => {
  describe('computePlayerStats', () => {
    it('should return zero stats for empty records', () => {
      const stats = computePlayerStats([]);
      expect(stats.totalGames).toBe(0);
      expect(stats.totalScore).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.highScore).toBe(0);
    });

    it('should compute correct totals', () => {
      const records: ScoreRecord[] = [
        { sessionId: 's1', userId: 'u1', score: 100, level: 3, maxStreak: 5, comboBonus: 20, timeBonusMs: 5000, completedAt: '2024-06-15T10:00:00Z', isDaily: false },
        { sessionId: 's2', userId: 'u1', score: 200, level: 5, maxStreak: 8, comboBonus: 50, timeBonusMs: 3000, completedAt: '2024-06-16T10:00:00Z', isDaily: false },
      ];
      const stats = computePlayerStats(records);
      expect(stats.totalGames).toBe(2);
      expect(stats.totalScore).toBe(300);
      expect(stats.averageScore).toBe(150);
      expect(stats.highScore).toBe(200);
      expect(stats.highestLevel).toBe(5);
      expect(stats.longestStreak).toBe(8);
    });

    it('should compute win rate correctly', () => {
      const records: ScoreRecord[] = [
        { sessionId: 's1', userId: 'u1', score: 100, level: 1, maxStreak: 1, comboBonus: 0, timeBonusMs: 0, completedAt: '2024-06-15T10:00:00Z', isDaily: false },
        { sessionId: 's2', userId: 'u1', score: 0, level: 1, maxStreak: 0, comboBonus: 0, timeBonusMs: 0, completedAt: '2024-06-16T10:00:00Z', isDaily: false },
      ];
      const stats = computePlayerStats(records);
      expect(stats.winRate).toBe(50);
    });

    it('should return recent scores sorted by date descending', () => {
      const records: ScoreRecord[] = Array.from({ length: 15 }, (_, i) => ({
        sessionId: `s${i}`,
        userId: 'u1',
        score: (i + 1) * 10,
        level: 1,
        maxStreak: 1,
        comboBonus: 0,
        timeBonusMs: 0,
        completedAt: `2024-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        isDaily: false,
      }));
      const stats = computePlayerStats(records);
      expect(stats.recentScores).toHaveLength(10);
      expect(stats.recentScores[0]).toBe(150);
    });
  });
});
