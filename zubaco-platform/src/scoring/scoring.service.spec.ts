import { ScoringService } from './scoring.service';
import { ScoringMetadata } from './scoring.types';

/**
 * Unit tests for ScoringService — the authoritative, client-untrusted score
 * engine. Pure business logic: no infrastructure, instantiated directly.
 *
 * Focus: success paths, boundary conditions (anti-exploit reaction floor,
 * score clamping, config caps), invalid/missing input (fallback), and the
 * config-driven generic scorer.
 */
describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  describe('missing / invalid metadata', () => {
    it('returns an unvalidated zero-score fallback when metadata is null', () => {
      const result = service.score('SLIDING_PUZZLE', null, {});
      expect(result.score).toBe(0);
      expect(result.validated).toBe(false);
      expect(result.maxScore).toBeGreaterThan(0);
      expect(result.breakdown[0].label).toMatch(/no verifiable metadata/i);
    });

    it('returns fallback when metadata has no verifiable facts', () => {
      const result = service.score('ARROWS', {}, {});
      expect(result.validated).toBe(false);
      expect(result.score).toBe(0);
    });

    it('never returns a negative score and always rounds to an integer', () => {
      const meta: ScoringMetadata = { correct: 3, wrong: 100 };
      const result = service.score('TRUE_FALSE_BLITZ', meta, { wrong_penalty: 50 });
      expect(result.score).toBe(0); // clamped, not negative
      expect(Number.isInteger(result.score)).toBe(true);
    });
  });

  describe('sliding puzzle (round-based)', () => {
    it('awards 100 per completed round plus a time bonus', () => {
      const meta: ScoringMetadata = {
        rounds: [{ completed: true }, { completed: true }, { completed: false }],
        timeRemaining: 30,
        timeTotal: 60,
      };
      const result = service.score('SLIDING_PUZZLE', meta, {});
      // 2 completed × 100 = 200, time bonus floor(10 × 30/60) = 5
      expect(result.score).toBe(205);
      expect(result.validated).toBe(true);
    });

    it('gives no time bonus when no time data is present', () => {
      const meta: ScoringMetadata = { rounds: [{ completed: true }] };
      const result = service.score('SLIDING_PUZZLE', meta, {});
      expect(result.score).toBe(100);
    });
  });

  describe('reaction-time scoring (anti-exploit floor)', () => {
    it('scores zero for the reaction component when solved in <= 5 seconds', () => {
      const meta: ScoringMetadata = { windowSec: 30, timeTakenSec: 4, completed: true };
      // Sliding puzzle reaction variant has winBase 0.
      const result = service.score('SLIDING_PUZZLE', meta, {});
      expect(result.score).toBe(0);
    });

    it('awards window minus time when solved after the 5 second floor', () => {
      const meta: ScoringMetadata = { windowSec: 30, timeTakenSec: 10, completed: true };
      const result = service.score('SLIDING_PUZZLE', meta, {});
      expect(result.score).toBe(20); // 30 - 10
    });

    it('scores zero when the reaction attempt was not completed', () => {
      const meta: ScoringMetadata = { windowSec: 30, timeTakenSec: 8, completed: false };
      const result = service.score('SLIDING_PUZZLE', meta, {});
      expect(result.score).toBe(0);
    });

    it('adds a win base for maze reaction wins on top of the reaction points', () => {
      const meta: ScoringMetadata = { windowSec: 20, timeTakenSec: 8, completed: true };
      const result = service.score('MAZE_NAVIGATION', meta, {});
      expect(result.score).toBe(62); // winBase 50 + (20 - 8)
    });
  });

  describe('spot the difference (penalty clamping)', () => {
    it('subtracts wrong-click and hint penalties but never below zero', () => {
      const meta: ScoringMetadata = {
        rounds: [{ wrongClicks: 100, hints: 100 }],
      };
      const result = service.score('FLASH_SPOT', meta, {});
      expect(result.score).toBe(0);
    });

    it('honours config-driven penalties and base points', () => {
      const meta: ScoringMetadata = { rounds: [{ wrongClicks: 2, hints: 1 }] };
      const cfg = { base_points: 100, wrong_click_penalty: 10, hint_penalty: 5 };
      // 100 - 2×10 - 1×5 = 75
      const result = service.score('FLASH_SPOT', meta, cfg);
      expect(result.score).toBe(75);
    });
  });

  describe('colour sorting (capped at 100)', () => {
    it('caps the total score at 100 even with maximum bonuses', () => {
      const meta: ScoringMetadata = {
        completed: true,
        optimalMoves: 10,
        movesTaken: 10,
        timeRemaining: 60,
        timeTotal: 60,
      };
      const result = service.score('COLOUR_SORTING', meta, {});
      expect(result.score).toBe(95); // 60 base + 25 eff + 10 speed = 95 (<=100)
      expect(result.maxScore).toBe(100);
    });

    it('scores zero for an incomplete board', () => {
      const meta: ScoringMetadata = { completed: false };
      const result = service.score('COLOUR_SORTING', meta, {});
      expect(result.score).toBe(0);
    });
  });

  describe('generic (config-driven) scorer', () => {
    it('computes correct × pointsPerCorrect minus wrong × penalty', () => {
      const meta: ScoringMetadata = { correct: 8, wrong: 2 };
      const cfg = { points_per_correct: 10, wrong_penalty: 5 };
      // 8×10 - 2×5 = 70
      const result = service.score('WORD_UNSCRAMBLE', meta, cfg);
      expect(result.score).toBe(70);
      expect(result.validated).toBe(true);
    });

    it('is used as a fallback for an unknown game type', () => {
      const meta: ScoringMetadata = { correct: 5 };
      const result = service.score('SOME_FUTURE_GAME', meta, { points_per_correct: 4 });
      expect(result.score).toBe(20);
    });
  });

  describe('maxScore resolution', () => {
    it('prefers a configured max_score over the derived maximum', () => {
      const meta: ScoringMetadata = { rounds: [{ completed: true }] };
      const result = service.score('SLIDING_PUZZLE', meta, { max_score: 999 });
      expect(result.maxScore).toBe(999);
    });
  });
});
