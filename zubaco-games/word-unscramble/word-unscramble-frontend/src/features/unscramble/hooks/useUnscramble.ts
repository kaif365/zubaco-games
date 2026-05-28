import { useState, useCallback, useRef, useEffect } from 'react';
import type { WordChallenge, WordAnswer, StageConfig } from '@/types/game';
import { generateWords } from '../engine/wordBank';
import { calculateScore, type ScoreResult } from '../engine/scorer';

type GamePhase = 'idle' | 'playing' | 'finished';

interface UnscrambleState {
  phase: GamePhase;
  words: WordChallenge[];
  currentIndex: number;
  answers: WordAnswer[];
  score: ScoreResult | null;
  timeRemainingMs: number;
  wordTimeRemainingMs: number;
  selectedIndices: number[];
  currentBuilt: string;
}

export function useUnscramble(config: StageConfig | null, seed: number | null) {
  const [state, setState] = useState<UnscrambleState>({
    phase: 'idle',
    words: [],
    currentIndex: 0,
    answers: [],
    score: null,
    timeRemainingMs: 0,
    wordTimeRemainingMs: 0,
    selectedIndices: [],
    currentBuilt: '',
  });

  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordStartRef = useRef<number>(0);
  const gameStartRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (globalTimerRef.current) { clearInterval(globalTimerRef.current); globalTimerRef.current = null; }
    if (wordTimerRef.current) { clearTimeout(wordTimerRef.current); wordTimerRef.current = null; }
  }, []);

  const advanceWord = useCallback(() => {
    if (!config) return;

    setState((prev) => {
      if (prev.phase !== 'playing') return prev;

      // Record unsolved if not already answered
      const alreadyAnswered = prev.answers.some((a) => a.wordIndex === prev.currentIndex);
      const nextAnswers = alreadyAnswered
        ? prev.answers
        : [...prev.answers, {
            wordIndex: prev.currentIndex,
            solved: false,
            selectedOrder: [],
            timeSpentMs: config.wordTimeMs,
            timestamp: Date.now(),
          }];

      const nextIdx = prev.currentIndex + 1;
      if (nextIdx >= prev.words.length) {
        clearTimers();
        const score = calculateScore(nextAnswers, config);
        return { ...prev, phase: 'finished' as const, score, answers: nextAnswers, currentIndex: nextIdx, selectedIndices: [], currentBuilt: '' };
      }

      wordStartRef.current = Date.now();
      return {
        ...prev,
        currentIndex: nextIdx,
        answers: nextAnswers,
        selectedIndices: [],
        currentBuilt: '',
        wordTimeRemainingMs: config.wordTimeMs,
      };
    });

    // Schedule next word advance
    if (config) {
      wordTimerRef.current = setTimeout(advanceWord, config.wordTimeMs);
    }
  }, [config, clearTimers]);

  const startGame = useCallback(() => {
    if (!config || seed === null) return;

    const words = generateWords(seed, config.totalWords);
    gameStartRef.current = Date.now();
    wordStartRef.current = Date.now();

    setState({
      phase: 'playing',
      words,
      currentIndex: 0,
      answers: [],
      score: null,
      timeRemainingMs: config.timeLimitMs,
      wordTimeRemainingMs: config.wordTimeMs,
      selectedIndices: [],
      currentBuilt: '',
    });

    // Global countdown
    globalTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - gameStartRef.current;
      const remaining = Math.max(0, config.timeLimitMs - elapsed);
      const wordElapsed = Date.now() - wordStartRef.current;
      const wordRemaining = Math.max(0, config.wordTimeMs - wordElapsed);

      setState((prev) => {
        if (remaining <= 0 && prev.phase === 'playing') {
          clearTimers();
          const score = calculateScore(prev.answers, config);
          return { ...prev, phase: 'finished', timeRemainingMs: 0, score };
        }
        return { ...prev, timeRemainingMs: remaining, wordTimeRemainingMs: wordRemaining };
      });
    }, 100);

    // Schedule first auto-advance
    wordTimerRef.current = setTimeout(advanceWord, config.wordTimeMs);
  }, [config, seed, advanceWord, clearTimers]);

  const selectLetter = useCallback((letterIdx: number) => {
    if (!config) return;

    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      if (prev.selectedIndices.includes(letterIdx)) return prev;

      const word = prev.words[prev.currentIndex];
      if (!word) return prev;

      const newSelected = [...prev.selectedIndices, letterIdx];
      const newBuilt = newSelected.map((i) => word.scrambled[i]).join('');

      // Check if complete
      if (newSelected.length === word.scrambled.length) {
        const solved = newBuilt === word.word;
        const timeSpentMs = Date.now() - wordStartRef.current;
        const answer: WordAnswer = {
          wordIndex: prev.currentIndex,
          solved,
          selectedOrder: newSelected,
          timeSpentMs,
          timestamp: Date.now(),
        };

        // If solved or all letters used, auto-advance after brief delay
        if (solved) {
          // Clear word timer and advance immediately
          if (wordTimerRef.current) { clearTimeout(wordTimerRef.current); wordTimerRef.current = null; }
          const nextIdx = prev.currentIndex + 1;
          const nextAnswers = [...prev.answers, answer];

          if (nextIdx >= prev.words.length) {
            clearTimers();
            const score = calculateScore(nextAnswers, config);
            return { ...prev, phase: 'finished' as const, score, answers: nextAnswers, selectedIndices: newSelected, currentBuilt: newBuilt, currentIndex: nextIdx };
          }

          wordStartRef.current = Date.now();
          wordTimerRef.current = setTimeout(advanceWord, config.wordTimeMs);
          return {
            ...prev,
            currentIndex: nextIdx,
            answers: nextAnswers,
            selectedIndices: [],
            currentBuilt: '',
            wordTimeRemainingMs: config.wordTimeMs,
          };
        } else {
          // Wrong order - reset selection
          return { ...prev, selectedIndices: [], currentBuilt: '' };
        }
      }

      return { ...prev, selectedIndices: newSelected, currentBuilt: newBuilt };
    });
  }, [config, advanceWord, clearTimers]);

  const deselectLetter = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      if (prev.selectedIndices.length === 0) return prev;
      const newSelected = prev.selectedIndices.slice(0, -1);
      const word = prev.words[prev.currentIndex];
      const newBuilt = newSelected.map((i) => word!.scrambled[i]).join('');
      return { ...prev, selectedIndices: newSelected, currentBuilt: newBuilt };
    });
  }, []);

  useEffect(() => { return () => clearTimers(); }, [clearTimers]);

  const currentWord = state.phase === 'playing' ? state.words[state.currentIndex] ?? null : null;

  return { ...state, currentWord, startGame, selectLetter, deselectLetter };
}
