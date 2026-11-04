import { CadenceAnalyzerService } from './cadence-analyzer.service';

describe('CadenceAnalyzerService (Module 7.2)', () => {
  let service: CadenceAnalyzerService;

  beforeEach(() => {
    service = new CadenceAnalyzerService();
  });

  describe('Sub-50ms Neuromuscular Floor Violation', () => {
    it('flags 6+ sub-50ms taps as CRITICAL bot pattern', () => {
      // 7 taps with 30ms spacing (6 intervals of 30ms < 50ms)
      const inputLog = [0, 30, 60, 90, 120, 150, 180];
      const result = service.analyze({ input_log: inputLog });

      expect(result.isCheat).toBe(true);
      expect(result.flagType).toBe('INPUT_BOT_PATTERN');
      expect(result.severity).toBe('CRITICAL');
      expect(result.reason).toContain('Sub-50ms superhuman neuromuscular tap cadence');
      expect(result.metrics.sub50msCount).toBe(6);
      expect(result.metrics.minIntervalMs).toBe(30);
    });

    it('flags 3-5 sub-50ms taps as HIGH bot pattern', () => {
      // 4 taps of 35ms spacing followed by natural spacing (3 intervals < 50ms)
      const inputLog = [0, 35, 70, 105, 500, 1000];
      const result = service.analyze({ input_log: inputLog });

      expect(result.isCheat).toBe(true);
      expect(result.flagType).toBe('INPUT_BOT_PATTERN');
      expect(result.severity).toBe('HIGH');
      expect(result.reason).toContain('Sub-50ms superhuman neuromuscular tap cadence');
      expect(result.metrics.sub50msCount).toBe(3);
    });
  });

  describe('Robotic Clockwork Regularity Check (StdDev < 5ms)', () => {
    it('flags clockwork synthetic inputs with near-zero standard deviation', () => {
      // 10 intervals with exactly 200ms spacing (stdDev = 0ms < 5ms)
      const inputLog = Array.from({ length: 11 }, (_, i) => i * 200);
      const result = service.analyze({ input_log: inputLog });

      expect(result.isCheat).toBe(true);
      expect(result.flagType).toBe('INPUT_BOT_PATTERN');
      expect(result.severity).toBe('HIGH');
      expect(result.reason).toContain('Robotic clockwork cadence');
      expect(result.metrics.stdDevMs).toBe(0);
      expect(result.metrics.avgIntervalMs).toBe(200);
    });

    it('flags inputs with tiny micro-jitter (stdDev < 5ms over 9 intervals)', () => {
      // Spacing alternating 199, 201, 200, 201, 199...
      const deltas = [200, 199, 201, 200, 201, 199, 200, 201, 199];
      let current = 0;
      const inputLog = [current];
      for (const d of deltas) {
        current += d;
        inputLog.push(current);
      }

      const result = service.analyze({ input_log: inputLog });
      expect(result.isCheat).toBe(true);
      expect(result.flagType).toBe('INPUT_BOT_PATTERN');
      expect(result.severity).toBe('HIGH');
      expect(result.metrics.stdDevMs).toBeLessThan(5);
    });
  });

  describe('Exact Pixel Coordinate Clamping (Synthetic Auto-Clicker)', () => {
    it('flags 5+ consecutive identical coordinates as synthetic coordinate injection', () => {
      const events = [
        { t: 0, x: 250, y: 400 },
        { t: 250, x: 250, y: 400 },
        { t: 550, x: 250, y: 400 },
        { t: 880, x: 250, y: 400 },
        { t: 1200, x: 250, y: 400 },
      ];

      const result = service.analyze(events);
      expect(result.isCheat).toBe(true);
      expect(result.flagType).toBe('INPUT_BOT_PATTERN');
      expect(result.severity).toBe('HIGH');
      expect(result.reason).toContain('Synthetic click coordinate injection');
      expect(result.metrics.identicalCoordsStreak).toBeGreaterThanOrEqual(5);
    });

    it('does not flag normal human finger taps with natural spatial variance', () => {
      const events = [
        { t: 0, x: 250, y: 401 },
        { t: 250, x: 252, y: 399 },
        { t: 560, x: 249, y: 403 },
        { t: 890, x: 251, y: 400 },
        { t: 1240, x: 250, y: 402 },
      ];

      const result = service.analyze(events);
      expect(result.isCheat).toBe(false);
      expect(result.metrics.identicalCoordsStreak).toBe(1);
    });
  });

  describe('Clean Human Play Acceptance', () => {
    it('passes human play with realistic neuromuscular variance and spacing', () => {
      // Natural human intervals varying from 180ms to 420ms
      const intervals = [210, 340, 180, 420, 290, 310, 260, 380];
      let current = 0;
      const events = [{ t: current, x: 120, y: 340 }];
      intervals.forEach((dt, idx) => {
        current += dt;
        events.push({ t: current, x: 120 + (idx % 5), y: 340 - (idx % 4) });
      });

      const result = service.analyze(events);
      expect(result.isCheat).toBe(false);
      expect(result.flagType).toBeUndefined();
      expect(result.metrics.sub50msCount).toBe(0);
      expect(result.metrics.stdDevMs).toBeGreaterThan(15);
    });
  });

  describe('Edge Cases and Defensive Input Handling', () => {
    it('handles null, undefined, and empty objects gracefully', () => {
      expect(service.analyze(null).isCheat).toBe(false);
      expect(service.analyze(undefined).isCheat).toBe(false);
      expect(service.analyze({}).isCheat).toBe(false);
    });

    it('handles fewer than 4 events gracefully', () => {
      const result = service.analyze({ input_log: [100, 200] });
      expect(result.isCheat).toBe(false);
      expect(result.metrics.totalInputs).toBe(2);
    });

    it('supports direct array of timestamps or event objects', () => {
      const rawTimestamps = [0, 25, 45, 70, 90, 115, 140];
      const result = service.analyze(rawTimestamps);
      expect(result.isCheat).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });
  });
});
