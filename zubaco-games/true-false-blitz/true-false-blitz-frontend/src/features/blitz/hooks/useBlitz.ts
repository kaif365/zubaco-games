import { useState, useCallback, useRef, useEffect } from 'react';
import type { Statement, BlitzAnswer, StageConfig } from '@/types/game';
import { generateStatements } from '../engine/statementBank';
import { calculateScore, type ScoreResult } from '../engine/scorer';

type GamePhase = 'idle' | 'playing' | 'finished';

interface BlitzState {
  phase: GamePhase;
  statements: Statement[];
  currentIndex: number;
  answers: BlitzAnswer[];
  score: ScoreResult | null;
  timeRemainingMs: number;
  streak: number;
  lastFeedback: 'correct' | 'wrong' | null;
  progress: number;
}

export function useBlitz(config: StageConfig | null, seed: number | null) {
  const [state, setState] = useState<BlitzState>({
    phase: 'idle',
    statements: [],
    currentIndex: 0,
    answers: [],
    score: null,
    timeRemainingMs: 0,
    streak: 0,
    lastFeedback: null,
    progress: 0,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const answeredRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null; }
  }, []);

  const advance = useCallback(() => {
    if (!config) return;

    setState((prev) => {
      if (prev.phase !== 'playing') return prev;

      const nextIdx = prev.currentIndex + 1;

      // If not answered, it's a miss (don't add to answers)
      if (nextIdx >= prev.statements.length) {
        clearTimers();
        const score = calculateScore(prev.answers, config.totalStatements, config);
        return { ...prev, phase: 'finished' as const, score, currentIndex: nextIdx };
      }

      answeredRef.current = false;
      return {
        ...prev,
        currentIndex: nextIdx,
        lastFeedback: null,
        progress: (nextIdx / prev.statements.length) * 100,
      };
    });

    // Schedule next advance
    advanceRef.current = setTimeout(advance, config.displayTimeMs);
  }, [config, clearTimers]);

  const startGame = useCallback(() => {
    if (!config || seed === null) return;

    const statements = generateStatements(seed, config.totalStatements);
    startTimeRef.current = Date.now();
    answeredRef.current = false;

    setState({
      phase: 'playing',
      statements,
      currentIndex: 0,
      answers: [],
      score: null,
      timeRemainingMs: config.timeLimitMs,
      streak: 0,
      lastFeedback: null,
      progress: 0,
    });

    // Global timer
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, config.timeLimitMs - elapsed);
      setState((prev) => {
        if (remaining <= 0 && prev.phase === 'playing') {
          clearTimers();
          const score = calculateScore(prev.answers, config.totalStatements, config);
          return { ...prev, phase: 'finished', timeRemainingMs: 0, score };
        }
        return { ...prev, timeRemainingMs: remaining };
      });
    }, 100);

    // Schedule first auto-advance
    advanceRef.current = setTimeout(advance, config.displayTimeMs);
  }, [config, seed, advance, clearTimers]);

  const answer = useCallback((chosenTrue: boolean) => {
    if (answeredRef.current) return;
    answeredRef.current = true;

    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      const statement = prev.statements[prev.currentIndex];
      if (!statement) return prev;

      const correct = statement.isTrue === chosenTrue;
      const blitzAnswer: BlitzAnswer = {
        statementIndex: prev.currentIndex,
        chosenTrue,
        correct,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        answers: [...prev.answers, blitzAnswer],
        streak: correct ? prev.streak + 1 : 0,
        lastFeedback: correct ? 'correct' : 'wrong',
      };
    });
  }, []);

  const finishGame = useCallback((): { answers: BlitzAnswer[]; score: ScoreResult } | null => {
    if (!config) return null;
    clearTimers();
    const score = calculateScore(state.answers, config.totalStatements, config);
    setState((prev) => ({ ...prev, phase: 'finished', score }));
    return { answers: state.answers, score };
  }, [config, state.answers, clearTimers]);

  useEffect(() => { return () => clearTimers(); }, [clearTimers]);

  const currentStatement = state.phase === 'playing' ? state.statements[state.currentIndex] ?? null : null;

  return { ...state, currentStatement, startGame, answer, finishGame };
}
