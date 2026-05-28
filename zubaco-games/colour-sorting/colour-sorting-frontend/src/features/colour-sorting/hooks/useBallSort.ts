import { useState, useCallback, useRef, useEffect } from 'react';
import type { Tube, GameMove, StageConfig, BallColor } from '@/types/game';
import { generatePuzzle, isValidMove, executeMove, isPuzzleSolved, isTubeSorted } from '../engine/puzzleGenerator';
import { calculateScore, type ScoreResult } from '../engine/scorer';

interface BallSortState {
  tubes: Tube[];
  selectedTube: number | null;
  moves: GameMove[];
  solved: boolean;
  timeRemainingMs: number;
  score: ScoreResult | null;
  gameActive: boolean;
  lastInvalidTube: number | null;
  lastCompletedTube: number | null;
  flyingBall: { fromTube: number; toTube: number; color: BallColor } | null;
  undoStack: Tube[][];
  comboStreak: number;
  maxStreak: number;
}

const STORAGE_KEY = 'zubaco_colour_sort_state';

export function useBallSort(config: StageConfig | null, seed: number | null) {
  const [state, setState] = useState<BallSortState>({
    tubes: [],
    selectedTube: null,
    moves: [],
    solved: false,
    timeRemainingMs: 0,
    score: null,
    gameActive: false,
    lastInvalidTube: null,
    lastCompletedTube: null,
    flyingBall: null,
    undoStack: [],
    comboStreak: 0,
    maxStreak: 0,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  // Timer pause on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && state.gameActive) {
        isPausedRef.current = true;
        pausedTimeRef.current = Date.now();
      } else if (!document.hidden && isPausedRef.current) {
        isPausedRef.current = false;
        const pauseDuration = Date.now() - pausedTimeRef.current;
        startTimeRef.current += pauseDuration;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.gameActive]);

  // Persist game state
  useEffect(() => {
    if (state.gameActive && state.tubes.length > 0) {
      try {
        const toSave = {
          tubes: state.tubes,
          moves: state.moves,
          startTime: startTimeRef.current,
          seed,
          configTimeLimitMs: config?.timeLimitMs,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
    }
  }, [state.tubes, state.moves, state.gameActive, seed, config]);

  const startGame = useCallback(() => {
    if (!config || seed === null) return;

    const tubes = generatePuzzle(seed, config);
    startTimeRef.current = Date.now();

    setState({
      tubes,
      selectedTube: null,
      moves: [],
      solved: false,
      timeRemainingMs: config.timeLimitMs,
      score: null,
      gameActive: true,
      lastInvalidTube: null,
      lastCompletedTube: null,
      flyingBall: null,
      undoStack: [],
      comboStreak: 0,
      maxStreak: 0,
    });

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, config.timeLimitMs - elapsed);
      setState((prev) => ({ ...prev, timeRemainingMs: remaining }));
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 100);
  }, [config, seed]);

  const restartGame = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    startGame();
  }, [startGame]);

  const undo = useCallback(() => {
    setState((prev) => {
      if (!prev.gameActive || prev.undoStack.length === 0) return prev;
      const newStack = [...prev.undoStack];
      const previousTubes = newStack.pop()!;
      const newMoves = prev.moves.slice(0, -1);
      return {
        ...prev,
        tubes: previousTubes,
        undoStack: newStack,
        moves: newMoves,
        selectedTube: null,
        comboStreak: 0,
      };
    });
  }, []);

  const tapTube = useCallback((tubeIdx: number) => {
    setState((prev) => {
      if (!prev.gameActive || prev.solved) return prev;

      // Clear transient states
      const base = { ...prev, lastInvalidTube: null, lastCompletedTube: null, flyingBall: null };

      // If no tube selected, select this one (if it has balls)
      if (prev.selectedTube === null) {
        if (prev.tubes[tubeIdx].balls.length === 0) return base;
        return { ...base, selectedTube: tubeIdx };
      }

      // If same tube tapped, deselect
      if (prev.selectedTube === tubeIdx) {
        return { ...base, selectedTube: null };
      }

      // Try to move ball(s) from selected to tapped
      if (!isValidMove(prev.tubes, prev.selectedTube, tubeIdx)) {
        // Invalid move - shake feedback
        if (prev.tubes[tubeIdx].balls.length > 0) {
          return { ...base, selectedTube: tubeIdx, lastInvalidTube: tubeIdx };
        }
        return { ...base, selectedTube: null, lastInvalidTube: tubeIdx };
      }

      const fromTube = prev.selectedTube;
      const topColor = prev.tubes[fromTube].balls[prev.tubes[fromTube].balls.length - 1];

      // Multi-ball move: count consecutive same-colour balls on top
      let ballsToMove = 1;
      const fromBalls = prev.tubes[fromTube].balls;
      for (let i = fromBalls.length - 2; i >= 0; i--) {
        if (fromBalls[i] === topColor) ballsToMove++;
        else break;
      }

      // Check how many can fit in destination
      const toTube = prev.tubes[tubeIdx];
      const spaceAvailable = toTube.capacity - toTube.balls.length;
      // Also check destination top color matches (or empty)
      if (toTube.balls.length > 0 && toTube.balls[toTube.balls.length - 1] !== topColor) {
        ballsToMove = 1; // fallback to single if somehow invalid
      }
      ballsToMove = Math.min(ballsToMove, spaceAvailable);

      // Save undo state
      const undoStack = [...prev.undoStack, prev.tubes.map(t => ({ ...t, balls: [...t.balls] }))];

      // Execute multi-ball move
      let newTubes = prev.tubes.map(t => ({ ...t, balls: [...t.balls] }));
      const movedBalls: BallColor[] = [];
      for (let i = 0; i < ballsToMove; i++) {
        const ball = newTubes[fromTube].balls.pop()!;
        newTubes[tubeIdx].balls.push(ball);
        movedBalls.push(ball);
      }

      const move: GameMove = { fromTube, toTube: tubeIdx, color: topColor, timestamp: Date.now() };
      const newMoves = [...prev.moves, move];
      const solved = isPuzzleSolved(newTubes);

      // Check if destination tube just became fully sorted
      const destTube = newTubes[tubeIdx];
      const justCompleted = destTube.balls.length === destTube.capacity && isTubeSorted(destTube);

      // Combo: valid move increases streak
      const newStreak = prev.comboStreak + 1;

      return {
        ...base,
        tubes: newTubes,
        selectedTube: null,
        moves: newMoves,
        solved,
        undoStack,
        flyingBall: { fromTube, toTube: tubeIdx, color: topColor },
        lastCompletedTube: justCompleted ? tubeIdx : null,
        comboStreak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
      };
    });
  }, []);

  const finishGame = useCallback((): { moves: GameMove[]; score: ScoreResult; maxStreak: number } | null => {
    if (!config) return null;
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = Date.now() - startTimeRef.current;
    const remainingMs = Math.max(0, config.timeLimitMs - elapsed);
    const score = calculateScore(state.tubes, state.moves.length, config, remainingMs);

    sessionStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({ ...prev, gameActive: false, score, timeRemainingMs: remainingMs }));
    return { moves: state.moves, score, maxStreak: state.maxStreak };
  }, [config, state.tubes, state.moves, state.maxStreak]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return { ...state, startGame, restartGame, tapTube, finishGame, undo };
}
