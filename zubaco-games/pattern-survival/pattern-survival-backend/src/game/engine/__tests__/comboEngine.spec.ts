import { createComboState, recordHit, recordMiss, calculateComboBonus } from '../comboEngine';

describe('ComboEngine', () => {
  describe('createComboState', () => {
    it('should return initial state with zero values', () => {
      const state = createComboState();
      expect(state.currentStreak).toBe(0);
      expect(state.maxStreak).toBe(0);
      expect(state.comboMultiplier).toBe(1.0);
      expect(state.totalComboBonus).toBe(0);
    });
  });

  describe('recordHit', () => {
    it('should increment streak on hit', () => {
      const state = recordHit(createComboState());
      expect(state.currentStreak).toBe(1);
      expect(state.maxStreak).toBe(1);
    });

    it('should increase multiplier at streak milestone', () => {
      let state = createComboState();
      for (let i = 0; i < 3; i++) state = recordHit(state);
      expect(state.comboMultiplier).toBe(1.25);
    });

    it('should cap multiplier at maxMultiplier', () => {
      let state = createComboState();
      for (let i = 0; i < 50; i++) state = recordHit(state);
      expect(state.comboMultiplier).toBeLessThanOrEqual(4.0);
    });

    it('should accumulate totalComboBonus', () => {
      let state = createComboState();
      state = recordHit(state);
      state = recordHit(state);
      expect(state.totalComboBonus).toBeGreaterThan(0);
    });
  });

  describe('recordMiss', () => {
    it('should reset streak to zero', () => {
      let state = createComboState();
      state = recordHit(state);
      state = recordHit(state);
      state = recordMiss(state);
      expect(state.currentStreak).toBe(0);
      expect(state.comboMultiplier).toBe(1.0);
    });

    it('should preserve maxStreak', () => {
      let state = createComboState();
      state = recordHit(state);
      state = recordHit(state);
      state = recordMiss(state);
      expect(state.maxStreak).toBe(2);
    });
  });

  describe('calculateComboBonus', () => {
    it('should process array of hits and misses', () => {
      const result = calculateComboBonus([true, true, true, false, true]);
      expect(result.maxStreak).toBe(3);
      expect(result.currentStreak).toBe(1);
    });

    it('should return zero state for empty inputs', () => {
      const result = calculateComboBonus([]);
      expect(result.currentStreak).toBe(0);
      expect(result.totalComboBonus).toBe(0);
    });

    it('should handle all misses', () => {
      const result = calculateComboBonus([false, false, false]);
      expect(result.maxStreak).toBe(0);
      expect(result.totalComboBonus).toBe(0);
    });
  });
});
