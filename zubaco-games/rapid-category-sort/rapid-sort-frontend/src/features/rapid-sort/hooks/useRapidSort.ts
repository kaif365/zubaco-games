import { useState, useCallback, useRef, useEffect } from 'react';
import type { CategoryItem, CategoryPair, SortAnswer, SortDirection, StageConfig } from '@/types/game';
import { generateItemSequence, getCategoryForItem } from '../engine/contentGenerator';
import { calculateScore, type ScoreResult } from '../engine/scorer';

type GamePhase = 'idle' | 'playing' | 'finished';

interface RapidSortState {
  phase: GamePhase;
  currentItemIndex: number;
  currentItem: CategoryItem | null;
  currentCategory: CategoryPair | null;
  answers: SortAnswer[];
  score: ScoreResult | null;
  timeRemainingMs: number;
  streak: number;
  lastFeedback: 'correct' | 'wrong' | 'missed' | null;
}

export function useRapidSort(config: StageConfig | null, seed: number | null) {
  const [state, setState] = useState<RapidSortState>({
    phase: 'idle',
    currentItemIndex: 0,
    currentItem: null,
    currentCategory: null,
    answers: [],
    score: null,
    timeRemainingMs: 0,
    streak: 0,
    lastFeedback: null,
  });

  const sequenceRef = useRef<CategoryItem[]>([]);
  const pairsRef = useRef<CategoryPair[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const itemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const answeredCurrentRef = useRef(false);
  const isPausedRef = useRef(false);
  const pausedAtRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (itemTimerRef.current) { clearTimeout(itemTimerRef.current); itemTimerRef.current = null; }
  }, []);

  const advanceItem = useCallback(() => {
    if (!config) return;

    setState((prev) => {
      const nextIdx = prev.currentItemIndex + 1;

      // If player didn't answer, count as missed (immutable update)
      const updatedAnswers = !answeredCurrentRef.current && prev.currentItem
        ? [...prev.answers, {
            itemIndex: prev.currentItemIndex,
            chosenSide: 'left' as SortDirection, // placeholder
            timestamp: Date.now(),
            correct: false,
          }]
        : prev.answers;

      // Check if game is over
      if (nextIdx >= sequenceRef.current.length) {
        clearTimers();
        const score = calculateScore(updatedAnswers, config.totalItems, config);
        return { ...prev, phase: 'finished' as const, currentItem: null, answers: updatedAnswers, score, lastFeedback: !answeredCurrentRef.current ? 'missed' : prev.lastFeedback };
      }

      const nextItem = sequenceRef.current[nextIdx];
      const nextCategory = getCategoryForItem(nextIdx, pairsRef.current, config.totalItems);
      answeredCurrentRef.current = false;

      return {
        ...prev,
        currentItemIndex: nextIdx,
        currentItem: nextItem,
        currentCategory: nextCategory,
        answers: updatedAnswers,
        lastFeedback: !answeredCurrentRef.current ? 'missed' : prev.lastFeedback,
        streak: !answeredCurrentRef.current ? 0 : prev.streak,
      };
    });

    // Schedule next item advance
    itemTimerRef.current = setTimeout(advanceItem, config.itemIntervalMs);
  }, [config, clearTimers]);

  const startGame = useCallback(() => {
    if (!config || seed === null) return;

    const { pairs, sequence } = generateItemSequence(seed, config.totalItems, config.categoryPoolSize);
    sequenceRef.current = sequence;
    pairsRef.current = pairs;
    answeredCurrentRef.current = false;
    startTimeRef.current = Date.now();

    const firstItem = sequence[0];
    const firstCategory = getCategoryForItem(0, pairs, config.totalItems);

    setState({
      phase: 'playing',
      currentItemIndex: 0,
      currentItem: firstItem,
      currentCategory: firstCategory,
      answers: [],
      score: null,
      timeRemainingMs: config.timeLimitMs,
      streak: 0,
      lastFeedback: null,
    });

    // Global countdown timer
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, config.timeLimitMs - elapsed);
      setState((prev) => {
        if (remaining <= 0 && prev.phase === 'playing') {
          clearTimers();
          const score = calculateScore(prev.answers, config.totalItems, config);
          return { ...prev, phase: 'finished', timeRemainingMs: 0, score };
        }
        return { ...prev, timeRemainingMs: remaining };
      });
    }, 100);

    // Schedule first item advance
    itemTimerRef.current = setTimeout(advanceItem, config.itemIntervalMs);
  }, [config, seed, advanceItem, clearTimers]);

  const swipe = useCallback((direction: SortDirection) => {
    if (!config) return;

    setState((prev) => {
      if (prev.phase !== 'playing' || !prev.currentItem || answeredCurrentRef.current) return prev;

      answeredCurrentRef.current = true;
      const correct = prev.currentItem.correctSide === direction;
      const answer: SortAnswer = {
        itemIndex: prev.currentItemIndex,
        chosenSide: direction,
        timestamp: Date.now(),
        correct,
      };

      return {
        ...prev,
        answers: [...prev.answers, answer],
        streak: correct ? prev.streak + 1 : 0,
        lastFeedback: correct ? 'correct' : 'wrong',
      };
    });
  }, [config]);

  const finishGame = useCallback((): { answers: SortAnswer[]; score: ScoreResult } | null => {
    if (!config) return null;
    clearTimers();
    const score = calculateScore(state.answers, config.totalItems, config);
    setState((prev) => ({ ...prev, phase: 'finished', score }));
    return { answers: state.answers, score };
  }, [config, state.answers, clearTimers]);

  // Pause timer on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && state.phase === 'playing') {
        isPausedRef.current = true;
        pausedAtRef.current = Date.now();
      } else if (!document.hidden && isPausedRef.current) {
        isPausedRef.current = false;
        const pauseDuration = Date.now() - pausedAtRef.current;
        startTimeRef.current += pauseDuration;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.phase]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return { ...state, startGame, swipe, finishGame };
}
