import { AchievementId, getAllAchievements, checkAchievements } from '../achievementEngine';
import type { GameStats, AchievementProgress } from '../achievementEngine';

describe('AchievementEngine', () => {
  describe('getAllAchievements', () => {
    it('should return all 10 achievements', () => {
      const achievements = getAllAchievements();
      expect(achievements).toHaveLength(10);
    });

    it('should have unique ids', () => {
      const achievements = getAllAchievements();
      const ids = achievements.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have xp values > 0', () => {
      const achievements = getAllAchievements();
      achievements.forEach((a) => expect(a.xp).toBeGreaterThan(0));
    });
  });

  describe('checkAchievements', () => {
    const emptyProgress: AchievementProgress[] = Object.values(AchievementId).map((id) => ({
      id: id as AchievementId,
      unlocked: false,
      unlockedAt: null,
    }));

    it('should unlock FIRST_WIN with 1 win', () => {
      const stats: GameStats = { totalGamesPlayed: 1, totalWins: 1, maxStreak: 0, highestScore: 100, highestLevel: 1, perfectGames: 0, fastCompletions: 0 };
      const result = checkAchievements(stats, emptyProgress);
      const firstWin = result.find((r) => r.id === AchievementId.FIRST_WIN);
      expect(firstWin?.unlocked).toBe(true);
      expect(firstWin?.unlockedAt).not.toBeNull();
    });

    it('should unlock STREAK_5 with maxStreak >= 5', () => {
      const stats: GameStats = { totalGamesPlayed: 10, totalWins: 5, maxStreak: 5, highestScore: 500, highestLevel: 3, perfectGames: 0, fastCompletions: 0 };
      const result = checkAchievements(stats, emptyProgress);
      const streak5 = result.find((r) => r.id === AchievementId.STREAK_5);
      expect(streak5?.unlocked).toBe(true);
    });

    it('should not unlock when conditions not met', () => {
      const stats: GameStats = { totalGamesPlayed: 0, totalWins: 0, maxStreak: 0, highestScore: 0, highestLevel: 0, perfectGames: 0, fastCompletions: 0 };
      const result = checkAchievements(stats, emptyProgress);
      result.forEach((r) => expect(r.unlocked).toBe(false));
    });

    it('should preserve already unlocked achievements', () => {
      const progress: AchievementProgress[] = emptyProgress.map((p) =>
        p.id === AchievementId.FIRST_WIN ? { ...p, unlocked: true, unlockedAt: '2024-01-01T00:00:00.000Z' } : p,
      );
      const stats: GameStats = { totalGamesPlayed: 0, totalWins: 0, maxStreak: 0, highestScore: 0, highestLevel: 0, perfectGames: 0, fastCompletions: 0 };
      const result = checkAchievements(stats, progress);
      const firstWin = result.find((r) => r.id === AchievementId.FIRST_WIN);
      expect(firstWin?.unlocked).toBe(true);
      expect(firstWin?.unlockedAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
