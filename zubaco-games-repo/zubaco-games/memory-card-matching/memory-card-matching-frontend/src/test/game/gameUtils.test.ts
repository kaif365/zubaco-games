import { describe, it, expect } from 'vitest';
import {
  countMatchedPairs,
  allPairsMatched,
  formatTime,
  flipAllCards,
  markCardsMatched,
  flipCardsDown,
} from '@/game/gameUtils';
import type { MemoryCard } from '@/models/game.types';

const makeCard = (id: string, pairId: string, overrides: Partial<MemoryCard> = {}): MemoryCard => ({
  id,
  pairId,
  contentType: 'symbol',
  content: '♠',
  isFlipped: false,
  isMatched: false,
  ...overrides,
});

describe('countMatchedPairs', () => {
  it('returns 0 when no cards are matched', () => {
    const cards = [makeCard('a', 'p0'), makeCard('b', 'p0')];
    expect(countMatchedPairs(cards)).toBe(0);
  });

  it('returns 1 when one pair is matched', () => {
    const cards = [
      makeCard('a', 'p0', { isMatched: true }),
      makeCard('b', 'p0', { isMatched: true }),
      makeCard('c', 'p1'),
      makeCard('d', 'p1'),
    ];
    expect(countMatchedPairs(cards)).toBe(1);
  });

  it('returns correct count for all matched', () => {
    const cards = [
      makeCard('a', 'p0', { isMatched: true }),
      makeCard('b', 'p0', { isMatched: true }),
      makeCard('c', 'p1', { isMatched: true }),
      makeCard('d', 'p1', { isMatched: true }),
    ];
    expect(countMatchedPairs(cards)).toBe(2);
  });

  it('returns 0 for empty array', () => {
    expect(countMatchedPairs([])).toBe(0);
  });
});

describe('allPairsMatched', () => {
  it('returns false for empty array', () => {
    expect(allPairsMatched([])).toBe(false);
  });

  it('returns false when some cards are unmatched', () => {
    const cards = [
      makeCard('a', 'p0', { isMatched: true }),
      makeCard('b', 'p0', { isMatched: true }),
      makeCard('c', 'p1'),
      makeCard('d', 'p1'),
    ];
    expect(allPairsMatched(cards)).toBe(false);
  });

  it('returns true when all cards are matched', () => {
    const cards = [
      makeCard('a', 'p0', { isMatched: true }),
      makeCard('b', 'p0', { isMatched: true }),
    ];
    expect(allPairsMatched(cards)).toBe(true);
  });
});

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds below 60', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exactly 60 seconds', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats larger values', () => {
    expect(formatTime(180)).toBe('3:00');
  });

  it('clamps negative input to 0:00', () => {
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('flipAllCards', () => {
  it('flips all unmatched cards to given state', () => {
    const cards = [makeCard('a', 'p0'), makeCard('b', 'p1')];
    const result = flipAllCards(cards, true);
    expect(result.every((c) => c.isFlipped)).toBe(true);
  });

  it('keeps matched cards flipped regardless of target state', () => {
    const cards = [
      makeCard('a', 'p0', { isMatched: true, isFlipped: true }),
      makeCard('b', 'p1'),
    ];
    const result = flipAllCards(cards, false);
    expect(result[0].isFlipped).toBe(true);
    expect(result[1].isFlipped).toBe(false);
  });

  it('does not mutate original cards', () => {
    const cards = [makeCard('a', 'p0', { isFlipped: true })];
    flipAllCards(cards, false);
    expect(cards[0].isFlipped).toBe(true);
  });
});

describe('markCardsMatched', () => {
  it('marks the two specified cards as matched and flipped', () => {
    const cards = [makeCard('a', 'p0'), makeCard('b', 'p0'), makeCard('c', 'p1')];
    const result = markCardsMatched(cards, 'a', 'b');
    expect(result[0].isMatched).toBe(true);
    expect(result[0].isFlipped).toBe(true);
    expect(result[1].isMatched).toBe(true);
    expect(result[2].isMatched).toBe(false);
  });

  it('does not affect other cards', () => {
    const cards = [makeCard('a', 'p0'), makeCard('b', 'p0'), makeCard('c', 'p1')];
    const result = markCardsMatched(cards, 'a', 'b');
    expect(result[2].isMatched).toBe(false);
    expect(result[2].isFlipped).toBe(false);
  });
});

describe('flipCardsDown', () => {
  it('flips specified unmatched cards face down', () => {
    const cards = [
      makeCard('a', 'p0', { isFlipped: true }),
      makeCard('b', 'p0', { isFlipped: true }),
      makeCard('c', 'p1', { isFlipped: true }),
    ];
    const result = flipCardsDown(cards, 'a', 'b');
    expect(result[0].isFlipped).toBe(false);
    expect(result[1].isFlipped).toBe(false);
    expect(result[2].isFlipped).toBe(true);
  });

  it('does not flip matched cards', () => {
    const cards = [
      makeCard('a', 'p0', { isFlipped: true, isMatched: true }),
      makeCard('b', 'p0', { isFlipped: true }),
    ];
    const result = flipCardsDown(cards, 'a', 'b');
    expect(result[0].isFlipped).toBe(true);
    expect(result[1].isFlipped).toBe(false);
  });
});
