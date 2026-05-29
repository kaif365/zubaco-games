import { useState, useCallback, useRef, useEffect } from 'react';
import type { CellData, CellAnswer, StageConfig } from '@/types/game';
import { generateGrid, generateRevealSchedule } from '../engine/gridGenerator';
import { calculateScore, type ScoreResult } from '../engine/scorer';

type GamePhase = 'idle' | 'observing' | 'filling' | 'finished';

interface GridState {
  phase: GamePhase;
  grid: CellData[];
  revealedIndices: Set<number>;
  playerAnswers: Map<string, CellAnswer>;
  score: ScoreResult | null;
  timeRemainingMs: number;
  selectedCell: { row: number; col: number } | null;
}

export function useGrid(config: StageConfig | null, seed: number | null) {
  const [state, setState] = useState<GridState>({
    phase: 'idle',
    grid: [],
    revealedIndices: new Set(),
    playerAnswers: new Map(),
    score: null,
    timeRemainingMs: 0,
    selectedCell: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const scheduleRef = useRef<number[][]>([]);
  const intervalIndexRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (revealRef.current) { clearInterval(revealRef.current); revealRef.current = null; }
  }, []);

  const startGame = useCallback(() => {
    if (!config || seed === null) return;

    const grid = generateGrid(seed, config.gridSize);
    const totalIntervals = Math.floor(config.timeLimitMs / config.hideIntervalMs);
    const schedule = generateRevealSchedule(seed, config.gridSize, totalIntervals);
    scheduleRef.current = schedule;
    intervalIndexRef.current = 0;
    startTimeRef.current = Date.now();

    setState({
      phase: 'filling',
      grid,
      revealedIndices: new Set(schedule[0] || []),
      playerAnswers: new Map(),
      score: null,
      timeRemainingMs: config.timeLimitMs,
      selectedCell: null,
    });

    // Reveal cycle: every hideIntervalMs, show next batch for revealDurationMs
    revealRef.current = setInterval(() => {
      intervalIndexRef.current++;
      const idx = intervalIndexRef.current;
      const batch = schedule[idx % schedule.length] || [];

      // Show cells
      setState((prev) => ({ ...prev, revealedIndices: new Set(batch) }));

      // Hide after revealDurationMs
      setTimeout(() => {
        setState((prev) => ({ ...prev, revealedIndices: new Set() }));
      }, config.revealDurationMs);
    }, config.hideIntervalMs);

    // Hide first batch after revealDuration
    setTimeout(() => {
      setState((prev) => ({ ...prev, revealedIndices: new Set() }));
    }, config.revealDurationMs);

    // Global countdown
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, config.timeLimitMs - elapsed);
      setState((prev) => {
        if (remaining <= 0 && prev.phase === 'filling') {
          clearTimers();
          const answers = Array.from(prev.playerAnswers.values());
          const score = calculateScore(answers, prev.grid, 0, config);
          return { ...prev, phase: 'finished', timeRemainingMs: 0, score };
        }
        return { ...prev, timeRemainingMs: remaining };
      });
    }, 100);
  }, [config, seed, clearTimers]);

  const selectCell = useCallback((row: number, col: number) => {
    setState((prev) => {
      if (prev.phase !== 'filling') return prev;
      return { ...prev, selectedCell: { row, col } };
    });
  }, []);

  const submitCellValue = useCallback((value: number) => {
    if (!config) return;

    setState((prev) => {
      if (prev.phase !== 'filling' || !prev.selectedCell) return prev;
      const { row, col } = prev.selectedCell;
      const key = `${row}-${col}`;
      const answer: CellAnswer = { row, col, value, timestamp: Date.now() };
      const newAnswers = new Map(prev.playerAnswers);
      newAnswers.set(key, answer);

      // Check if all cells filled
      if (newAnswers.size >= config.gridSize * config.gridSize) {
        clearTimers();
        const remaining = Math.max(0, config.timeLimitMs - (Date.now() - startTimeRef.current));
        const answers = Array.from(newAnswers.values());
        const score = calculateScore(answers, prev.grid, remaining, config);
        return { ...prev, playerAnswers: newAnswers, selectedCell: null, phase: 'finished', score, timeRemainingMs: remaining };
      }

      return { ...prev, playerAnswers: newAnswers, selectedCell: null };
    });
  }, [config, clearTimers]);

  const finishEarly = useCallback(() => {
    if (!config) return;
    clearTimers();
    setState((prev) => {
      const remaining = Math.max(0, config.timeLimitMs - (Date.now() - startTimeRef.current));
      const answers = Array.from(prev.playerAnswers.values());
      const score = calculateScore(answers, prev.grid, remaining, config);
      return { ...prev, phase: 'finished', score, timeRemainingMs: remaining };
    });
  }, [config, clearTimers]);

  useEffect(() => { return () => clearTimers(); }, [clearTimers]);

  return {
    ...state,
    answers: Array.from(state.playerAnswers.values()),
    startGame,
    selectCell,
    submitCellValue,
    finishEarly,
  };
}
