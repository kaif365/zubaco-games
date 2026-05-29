import { FLIP_ANIMATION_DURATION_MS, GAME_STATES } from '@/constants/game.constants';
import type { GameState, MemoryCard } from '@/models/game.types';
import {
  getMemoryCardElement,
  playLevelCompleteConfetti,
  playMatchPairAnimation,
  playMismatchAnimation,
} from '@/animations/memorycard-animations';
import { useEffect, useRef, type MutableRefObject } from 'react';

function getFlippedPair(cards: MemoryCard[]): MemoryCard[] {
  return cards.filter((c) => c.isFlipped && !c.isMatched);
}

function getSuccessfulMatchPair(prevCards: MemoryCard[]): MemoryCard[] {
  const flipped = getFlippedPair(prevCards);
  if (flipped.length !== 2 || flipped[0].pairId !== flipped[1].pairId) return [];
  return flipped;
}

function scheduleLevelConfetti(
  levelConfettiRafRef: MutableRefObject<number | null>,
  levelCancelRef: MutableRefObject<(() => void) | null>,
): void {
  if (levelConfettiRafRef.current !== null) {
    cancelAnimationFrame(levelConfettiRafRef.current);
  }
  levelConfettiRafRef.current = requestAnimationFrame(() => {
    levelConfettiRafRef.current = requestAnimationFrame(() => {
      levelConfettiRafRef.current = null;
      levelCancelRef.current?.();
      const handle = playLevelCompleteConfetti();
      levelCancelRef.current = () => handle.cancel();
    });
  });
}

function playLevelCompleteMandalaGlow(
  burstRef: MutableRefObject<HTMLElement | null>,
  burstTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  const root = document.documentElement;
  root.classList.remove('memory-mandala-level-complete');
  burstRef.current?.remove();
  if (burstTimerRef.current) clearTimeout(burstTimerRef.current);

  // Force the CSS animation to restart for each completed level.
  void root.offsetWidth;
  root.classList.add('memory-mandala-level-complete');

  const burst = document.createElement('div');
  burst.className = 'level-complete-burst';
  burst.setAttribute('aria-hidden', 'true');
  document.body.appendChild(burst);
  burstRef.current = burst;

  burstTimerRef.current = setTimeout(() => {
    root.classList.remove('memory-mandala-level-complete');
    burst.remove();
    if (burstRef.current === burst) burstRef.current = null;
    burstTimerRef.current = null;
  }, 2300);
}

/**
 * Drives match / mismatch juice animations from reducer state (mirrors SFX timing).
 */
export function useMemoryCardJuiceAnimations(
  gameState: GameState,
  cards: MemoryCard[],
  matchedPairs: number,
) {
  const prevGameStateRef = useRef<GameState>(gameState);
  const prevCardsRef = useRef(cards);
  const bootRef = useRef(true);
  const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchRafRef = useRef<number | null>(null);
  const levelConfettiRafRef = useRef<number | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const levelCancelRef = useRef<(() => void) | null>(null);
  const levelBurstRef = useRef<HTMLElement | null>(null);
  const levelBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposeRef = useRef<(() => void) | null>(null);

  const syncDispose = () => {
    disposeRef.current = () => {
      const mismatchTimer = mismatchTimerRef.current;
      if (mismatchTimer) clearTimeout(mismatchTimer);
      mismatchTimerRef.current = null;

      const matchRaf = matchRafRef.current;
      if (matchRaf !== null) cancelAnimationFrame(matchRaf);
      matchRafRef.current = null;

      const levelConfettiRaf = levelConfettiRafRef.current;
      if (levelConfettiRaf !== null) cancelAnimationFrame(levelConfettiRaf);
      levelConfettiRafRef.current = null;

      const levelBurstTimer = levelBurstTimerRef.current;
      if (levelBurstTimer) clearTimeout(levelBurstTimer);
      levelBurstTimerRef.current = null;

      document.documentElement.classList.remove('memory-mandala-level-complete');

      const levelBurst = levelBurstRef.current;
      levelBurst?.remove();
      levelBurstRef.current = null;

      cancelRef.current?.();
      cancelRef.current = null;

      levelCancelRef.current?.();
      levelCancelRef.current = null;
    };
  };

  useEffect(() => {
    const prevGs = prevGameStateRef.current;
    const prevCards = prevCardsRef.current;

    if (!bootRef.current) {
      if (
        prevGs !== GAME_STATES.CHECKING_MATCH &&
        gameState === GAME_STATES.CHECKING_MATCH
      ) {
        const pair = getFlippedPair(cards);
        if (pair.length === 2 && pair[0].pairId !== pair[1].pairId) {
          mismatchTimerRef.current = setTimeout(() => {
            cancelRef.current?.();
            const handles = pair
              .map((c) => getMemoryCardElement(c.id))
              .filter((el): el is HTMLElement => el !== null)
              .map((el) => playMismatchAnimation(el));
            cancelRef.current = () => handles.forEach((h) => h.cancel());
          }, FLIP_ANIMATION_DURATION_MS);
        }
      }

      const leftChecking =
        prevGs === GAME_STATES.CHECKING_MATCH &&
        gameState !== GAME_STATES.CHECKING_MATCH;

      if (leftChecking) {
        const matchedPair = getSuccessfulMatchPair(prevCards);
        if (matchedPair.length === 2) {
          if (matchRafRef.current !== null) cancelAnimationFrame(matchRafRef.current);
          matchRafRef.current = requestAnimationFrame(() => {
            matchRafRef.current = requestAnimationFrame(() => {
              matchRafRef.current = null;
              const els = matchedPair
                .map((c) => getMemoryCardElement(c.id))
                .filter((el): el is HTMLElement => el !== null);
              if (els.length === 2) {
                cancelRef.current?.();
                const handle = playMatchPairAnimation(els[0], els[1]);
                cancelRef.current = () => handle.cancel();
              }
            });
          });
        }
      }

      if (gameState === GAME_STATES.LEVEL_TRANSITION && prevGs !== GAME_STATES.LEVEL_TRANSITION) {
        playLevelCompleteMandalaGlow(levelBurstRef, levelBurstTimerRef);
        scheduleLevelConfetti(levelConfettiRafRef, levelCancelRef);
      }

      if (gameState === GAME_STATES.FINISHED && prevGs === GAME_STATES.CHECKING_MATCH) {
        playLevelCompleteMandalaGlow(levelBurstRef, levelBurstTimerRef);
        scheduleLevelConfetti(levelConfettiRafRef, levelCancelRef);
      }
    }

    prevGameStateRef.current = gameState;
    prevCardsRef.current = cards;
    bootRef.current = false;
    syncDispose();
  }, [gameState, cards, matchedPairs]);

  useEffect(() => () => disposeRef.current?.(), []);
}
