import { generateSequence, isMoveCorrect } from '@/features/sequence-recall/engine/sequence';

describe('sequence helpers', () => {
  it('creates deterministic sequence with injected rng', () => {
    const values = [0.0, 0.2, 0.4, 0.6, 0.8];
    let callIndex = 0;
    const rng = jest.fn<number, []>(() => {
      const value = values[Math.min(values.length - 1, callIndex)];
      callIndex += 1;
      return value;
    });
    const sequence = generateSequence(4, 4, rng);
    expect(sequence).toHaveLength(4);
    expect(sequence.every((tile) => tile >= 1 && tile <= 4)).toBe(true);
  });

  it('validates move against current step', () => {
    const sequence = [1, 3, 2] as const;
    expect(isMoveCorrect([...sequence], [], 1)).toBe(true);
    expect(isMoveCorrect([...sequence], [1], 2)).toBe(false);
  });
});
