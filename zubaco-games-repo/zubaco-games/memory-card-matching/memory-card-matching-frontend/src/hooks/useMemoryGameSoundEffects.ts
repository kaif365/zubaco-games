import { FLIP_ANIMATION_DURATION_MS, GAME_STATES } from '@/constants/game.constants';
import type { GameState, MemoryCard } from '@/models/game.types';
import { useEffect, useRef } from 'react';
import { useMemoryCardSfx } from '@/hooks/useMemoryCardSfx';

function countFlippedUnmatched(cards: MemoryCard[]): number {
  return cards.filter((c) => c.isFlipped && !c.isMatched).length;
}

/**
 * Plays flip / match / mismatch / level-complete SFX from memory game reducer state.
 * Mount only on demo or gameplay screens.
 */
export function useMemoryGameSoundEffects(
  gameState: GameState,
  cards: MemoryCard[],
  matchedPairs: number,
) {
  const { playFlip, playMatch, playMismatch, playLevelComplete } = useMemoryCardSfx();
  const prevGameStateRef = useRef<GameState>(gameState);
  const prevMatchedRef = useRef(matchedPairs);
  const flipUnmatchedPrevRef = useRef<number | null>(null);
  const bootRef = useRef(true);
  const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevGs = prevGameStateRef.current;
    const prevM = prevMatchedRef.current;

    if (!bootRef.current) {
      if (
        prevGs !== GAME_STATES.CHECKING_MATCH &&
        gameState === GAME_STATES.CHECKING_MATCH
      ) {
        const flippedUnmatched = cards.filter((c) => c.isFlipped && !c.isMatched);
        if (
          flippedUnmatched.length === 2 &&
          flippedUnmatched[0].pairId !== flippedUnmatched[1].pairId
        ) {
          mismatchTimerRef.current = setTimeout(playMismatch, FLIP_ANIMATION_DURATION_MS);
        }
      } else if (
        prevGs === GAME_STATES.CHECKING_MATCH &&
        (gameState === GAME_STATES.PLAYING ||
          gameState === GAME_STATES.LEVEL_TRANSITION ||
          gameState === GAME_STATES.FINISHED) &&
        matchedPairs > prevM
      ) {
        playMatch();
      }

      if (gameState === GAME_STATES.LEVEL_TRANSITION && prevGs !== GAME_STATES.LEVEL_TRANSITION) {
        playLevelComplete();
      }
    }

    prevGameStateRef.current = gameState;
    prevMatchedRef.current = matchedPairs;
    bootRef.current = false;
  }, [gameState, matchedPairs, cards, playLevelComplete, playMatch, playMismatch]);

  useEffect(() => {
    return () => {
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const inPlay =
      gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.CHECKING_MATCH;
    if (
      gameState === GAME_STATES.PREVIEW ||
      gameState === GAME_STATES.LOADING ||
      gameState === GAME_STATES.FINISHED
    ) {
      flipUnmatchedPrevRef.current = null;
      return;
    }

    if (!inPlay) {
      return;
    }

    const n = countFlippedUnmatched(cards);
    const prev = flipUnmatchedPrevRef.current;
    if (prev !== null && n > prev) {
      playFlip();
    }
    flipUnmatchedPrevRef.current = n;
  }, [cards, gameState, playFlip]);
}
