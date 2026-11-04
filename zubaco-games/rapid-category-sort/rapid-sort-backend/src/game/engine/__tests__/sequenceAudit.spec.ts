import { generateItemSequence } from '../contentGenerator';

describe('Rapid Sort Dynamic Category Rule & Sequence Audit', () => {
  it('generates deterministic sequence from seed with correct category partitioning', () => {
    const seed = 42;
    const totalItems = 20;
    const poolSize = 3;

    const res1 = generateItemSequence(seed, totalItems, poolSize);
    const res2 = generateItemSequence(seed, totalItems, poolSize);

    expect(res1.sequence.length).toBe(totalItems);
    expect(res1.pairs.length).toBe(poolSize);

    // Deterministic repeatability from same seed
    expect(res1.sequence).toEqual(res2.sequence);

    // Verify all items have valid directional assignment
    for (const item of res1.sequence) {
      expect(['left', 'right']).toContain(item.correctSide);
      expect(typeof item.text).toBe('string');
      expect(item.text.length).toBeGreaterThan(0);
    }
  });

  it('guarantees unique item IDs in sorted sequence', () => {
    const res = generateItemSequence(1234, 30, 4);
    const ids = res.sequence.map((it) => it.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(res.sequence.length);
  });
});
