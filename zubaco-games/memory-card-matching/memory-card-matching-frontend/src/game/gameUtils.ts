import type { MemoryCard } from '@/models/game.types';

/**
 * Counts the number of matched pairs in the card array.
 *
 * @param {MemoryCard[]} cards - The current array of memory cards.
 *
 * @returns {number} The number of matched pairs.
 */
export const countMatchedPairs = (cards: MemoryCard[]): number =>
  cards.filter((c) => c.isMatched).length / 2;

/**
 * Returns true when every card in the array has been matched.
 *
 * @param {MemoryCard[]} cards - The current array of memory cards.
 *
 * @returns {boolean} Whether all pairs are matched.
 */
export const allPairsMatched = (cards: MemoryCard[]): boolean =>
  cards.length > 0 && cards.every((c) => c.isMatched);

/**
 * Formats a number of seconds into a MM:SS display string.
 *
 * @param {number} seconds - Total seconds to format.
 *
 * @returns {string} Formatted time string (e.g. "1:05").
 */
export const formatTime = (seconds: number): string => {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Returns a new card array with every card set to the given flip state,
 * leaving already-matched cards flipped face-up regardless.
 *
 * @param {MemoryCard[]} cards - The current array of memory cards.
 * @param {boolean} isFlipped - The desired flip state for unmatched cards.
 *
 * @returns {MemoryCard[]} Updated card array.
 */
export const flipAllCards = (cards: MemoryCard[], isFlipped: boolean): MemoryCard[] =>
  cards.map((c) => ({ ...c, isFlipped: c.isMatched ? true : isFlipped }));

/**
 * Returns a new card array with the two specified cards marked as matched.
 *
 * @param {MemoryCard[]} cards - The current array of memory cards.
 * @param {string} firstId - ID of the first matched card.
 * @param {string} secondId - ID of the second matched card.
 *
 * @returns {MemoryCard[]} Updated card array.
 */
export const markCardsMatched = (cards: MemoryCard[], firstId: string, secondId: string): MemoryCard[] =>
  cards.map((c) =>
    c.id === firstId || c.id === secondId ? { ...c, isMatched: true, isFlipped: true } : c,
  );

/**
 * Returns a new card array with the two specified unmatched cards flipped face-down.
 *
 * @param {MemoryCard[]} cards - The current array of memory cards.
 * @param {string} firstId - ID of the first card to flip down.
 * @param {string} secondId - ID of the second card to flip down.
 *
 * @returns {MemoryCard[]} Updated card array.
 */
export const flipCardsDown = (cards: MemoryCard[], firstId: string, secondId: string): MemoryCard[] =>
  cards.map((c) =>
    (c.id === firstId || c.id === secondId) && !c.isMatched ? { ...c, isFlipped: false } : c,
  );
