import {
  regenerateCircleSequence,
  validateTaps,
} from '../circleValidator';

describe('Reflex Endurance — Circle Sequence & Tap Validation Audit', () => {
  it('deterministically regenerates circle sequences matching PRNG seed', () => {
    const seq1 = regenerateCircleSequence(12345, 50);
    const seq2 = regenerateCircleSequence(12345, 50);
    const seq3 = regenerateCircleSequence(98765, 50);

    expect(seq1).toEqual(seq2);
    expect(seq1.length).toBe(50);

    const diffs = seq1.filter((c, i) => c.color !== seq3[i]?.color).length;
    expect(diffs).toBeGreaterThan(20);
  });

  it('maintains expected statistical distribution for targets vs distractors', () => {
    const sampleSize = 1000;
    const circles = regenerateCircleSequence(424242, sampleSize);

    const counts = { green: 0, red: 0, blue: 0, yellow: 0 };
    for (const c of circles) {
      counts[c.color]++;
    }

    // Target (green) expected ~40% (35% - 45% tolerance on 1000 items)
    const greenPct = counts.green / sampleSize;
    expect(greenPct).toBeGreaterThan(0.35);
    expect(greenPct).toBeLessThan(0.45);

    // Distractors (red, blue, yellow) expected ~20% each (15% - 25% tolerance)
    expect(counts.red / sampleSize).toBeGreaterThan(0.15);
    expect(counts.blue / sampleSize).toBeGreaterThan(0.15);
    expect(counts.yellow / sampleSize).toBeGreaterThan(0.15);
  });

  it('correctly scores valid green taps and penalizes distractor taps', () => {
    const circles = regenerateCircleSequence(55555, 20);
    const greenCircle = circles.find((c) => c.color === 'green')!;
    const redCircle = circles.find((c) => c.color === 'red')!;

    const taps = [
      { circleId: greenCircle.id, timestamp: 1000, correct: true },
      { circleId: redCircle.id, timestamp: 2000, correct: false },
    ];

    const result = validateTaps(55555, taps, 20);
    expect(result.correctTaps).toBe(1);
    expect(result.wrongTaps).toBe(1);
  });

  it('deduplicates multiple rapid clicks on the same circle ID', () => {
    const circles = regenerateCircleSequence(77777, 20);
    const greenCircle = circles.find((c) => c.color === 'green')!;

    const duplicateTaps = [
      { circleId: greenCircle.id, timestamp: 1000, correct: true },
      { circleId: greenCircle.id, timestamp: 1050, correct: true },
      { circleId: greenCircle.id, timestamp: 1100, correct: true },
    ];

    const result = validateTaps(77777, duplicateTaps, 20);
    expect(result.correctTaps).toBe(1);
    expect(result.wrongTaps).toBe(0);
  });

  it('penalizes clicks on non-existent circle IDs as fabricated taps', () => {
    const taps = [
      { circleId: 999999, timestamp: 1000, correct: true },
    ];

    const result = validateTaps(12345, taps, 20);
    expect(result.correctTaps).toBe(0);
    expect(result.wrongTaps).toBe(1);
  });
});
