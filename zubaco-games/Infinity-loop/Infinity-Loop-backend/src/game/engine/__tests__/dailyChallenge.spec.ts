import { getDailyChallenge, isDailyChallengeDate } from '../dailyChallenge';

describe('DailyChallenge', () => {
  describe('getDailyChallenge', () => {
    it('should return a challenge with date, seed, level, and bonusMultiplier', () => {
      const challenge = getDailyChallenge('test-game', new Date('2024-06-15'));
      expect(challenge.date).toBe('2024-06-15');
      expect(typeof challenge.seed).toBe('number');
      expect(challenge.level).toBeGreaterThanOrEqual(1);
      expect(challenge.level).toBeLessThanOrEqual(10);
      expect(challenge.bonusMultiplier).toBeGreaterThanOrEqual(1.5);
    });

    it('should return same challenge for same date and game', () => {
      const d = new Date('2024-06-15');
      const c1 = getDailyChallenge('game-a', d);
      const c2 = getDailyChallenge('game-a', d);
      expect(c1).toEqual(c2);
    });

    it('should return different challenges for different games', () => {
      const d = new Date('2024-06-15');
      const c1 = getDailyChallenge('game-a', d);
      const c2 = getDailyChallenge('game-b', d);
      expect(c1.seed).not.toBe(c2.seed);
    });

    it('should return different challenges for different dates', () => {
      const c1 = getDailyChallenge('test', new Date('2024-06-15'));
      const c2 = getDailyChallenge('test', new Date('2024-06-16'));
      expect(c1.seed).not.toBe(c2.seed);
    });

    it('should have higher level on Sunday', () => {
      const sunday = new Date('2024-06-16'); // Sunday
      const challenge = getDailyChallenge('test', sunday);
      expect(challenge.level).toBe(7);
    });
  });

  describe('isDailyChallengeDate', () => {
    it('should return true for matching date', () => {
      const today = new Date('2024-06-15');
      expect(isDailyChallengeDate('2024-06-15', today)).toBe(true);
    });

    it('should return false for different date', () => {
      expect(isDailyChallengeDate('2024-01-01', new Date('2024-06-15'))).toBe(false);
    });
  });
});
