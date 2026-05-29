import { Leaderboard } from '../leaderboard';

describe('Leaderboard', () => {
  let board: Leaderboard;

  beforeEach(() => {
    board = new Leaderboard({ maxEntries: 5 });
  });

  describe('submit', () => {
    it('should add entry and return rank 1 for first submission', () => {
      const result = board.submit('user1', 100);
      expect(result.rank).toBe(1);
      expect(result.isNewHigh).toBe(true);
    });

    it('should rank higher scores first', () => {
      board.submit('user1', 100);
      board.submit('user2', 200);
      const top = board.getTop(2);
      expect(top[0].userId).toBe('user2');
      expect(top[1].userId).toBe('user1');
    });

    it('should update score if higher', () => {
      board.submit('user1', 100);
      const result = board.submit('user1', 200);
      expect(result.isNewHigh).toBe(true);
      expect(board.getTop(1)[0].score).toBe(200);
    });

    it('should not update score if lower', () => {
      board.submit('user1', 200);
      const result = board.submit('user1', 100);
      expect(result.isNewHigh).toBe(false);
      expect(board.getTop(1)[0].score).toBe(200);
    });

    it('should limit to maxEntries', () => {
      for (let i = 0; i < 10; i++) board.submit(`user${i}`, i * 10);
      expect(board.getTop(100)).toHaveLength(5);
    });
  });

  describe('getRank', () => {
    it('should return entry for existing user', () => {
      board.submit('user1', 100);
      const entry = board.getRank('user1');
      expect(entry?.rank).toBe(1);
      expect(entry?.score).toBe(100);
    });

    it('should return null for non-existing user', () => {
      expect(board.getRank('nobody')).toBeNull();
    });
  });

  describe('getAroundUser', () => {
    it('should return nearby entries', () => {
      for (let i = 1; i <= 5; i++) board.submit(`user${i}`, i * 100);
      const around = board.getAroundUser('user3', 1);
      expect(around.length).toBeGreaterThanOrEqual(2);
    });

    it('should return top entries for non-existing user', () => {
      board.submit('user1', 100);
      const around = board.getAroundUser('nobody');
      expect(around.length).toBeGreaterThan(0);
    });
  });
});
