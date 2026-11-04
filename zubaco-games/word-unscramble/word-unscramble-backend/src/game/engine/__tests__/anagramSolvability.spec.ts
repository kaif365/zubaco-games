import { generateWords } from '../wordBank';

describe('Word Unscramble Anagram Solvability & Dictionary Invariant', () => {
  it('guarantees scrambled letters form a valid exact permutation of target word', () => {
    const challenges = generateWords(12345, 10);
    expect(challenges.length).toBe(10);

    for (const challenge of challenges) {
      expect(challenge.word.length).toBeGreaterThanOrEqual(4);
      expect(challenge.scrambled.length).toBe(challenge.word.length);

      const originalSorted = challenge.word.split('').sort().join('');
      const scrambledSorted = [...challenge.scrambled].sort().join('');

      // Mathematical permutation invariant: multiset of characters must be strictly identical
      expect(scrambledSorted).toBe(originalSorted);
    }
  });

  it('guarantees deterministic repeatable generation from the same seed', () => {
    const list1 = generateWords(999, 5);
    const list2 = generateWords(999, 5);
    expect(list1).toEqual(list2);
  });

  it('ensures all challenges contain non-empty uppercase strings', () => {
    const challenges = generateWords(777, 15);
    for (const c of challenges) {
      expect(c.word).toMatch(/^[A-Z]+$/);
    }
  });
});
