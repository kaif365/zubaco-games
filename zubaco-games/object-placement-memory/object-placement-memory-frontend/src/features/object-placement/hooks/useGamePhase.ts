import { useState, useCallback, useRef, useEffect } from 'react';
import type { GamePhase, StageConfig, GridPlacement, ObjectItem, PlacementAttempt } from '@/types/game';
import { generateBoard, getTrayObjects } from '../engine/boardGenerator';
import { calculateScore, type ScoreResult } from '../engine/scorer';

interface GamePhaseState {
  phase: GamePhase;
  placements: GridPlacement[];
  trayObjects: ObjectItem[];
  userPlacements: Map<number, ObjectItem>;
  timeRemainingMs: number;
  score: ScoreResult | null;
}

export function useGamePhase(config: StageConfig | null, seed: number | null) {
  const [state, setState] = useState<GamePhaseState>({
    phase: 'idle',
    placements: [],
    trayObjects: [],
    userPlacements: new Map(),
    timeRemainingMs: 0,
    score: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const pausedAtRef = useRef(0);

  // Start memorize phase
  const startMemorize = useCallback(() => {
    if (!config || seed === null) return;

    const board = generateBoard(seed, config);
    const tray = getTrayObjects(board, seed);

    setState({
      phase: 'memorize',
      placements: board,
      trayObjects: tray,
      userPlacements: new Map(),
      timeRemainingMs: config.recallTimeMs,
      score: null,
    });

    // Auto-transition to recall after memorize time
    setTimeout(() => {
      startRecall();
    }, config.memorizeTimeMs);
  }, [config, seed]);

  // Start recall phase with countdown
  const startRecall = useCallback(() => {
    if (!config) return;

    startTimeRef.current = Date.now();

    setState((prev) => ({
      ...prev,
      phase: 'recall',
      timeRemainingMs: config.recallTimeMs,
    }));

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, config.recallTimeMs - elapsed);

      setState((prev) => ({ ...prev, timeRemainingMs: remaining }));

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 100);
  }, [config]);

  // Place an object on the grid
  const placeObject = useCallback((cellIndex: number, object: ObjectItem) => {
    setState((prev) => {
      const newPlacements = new Map(prev.userPlacements);
      // Remove object from any previous position
      for (const [key, val] of newPlacements) {
        if (val.id === object.id) {
          newPlacements.delete(key);
          break;
        }
      }
      newPlacements.set(cellIndex, object);
      return { ...prev, userPlacements: newPlacements };
    });
  }, []);

  // Remove object from grid (back to tray)
  const removeObject = useCallback((cellIndex: number) => {
    setState((prev) => {
      const newPlacements = new Map(prev.userPlacements);
      newPlacements.delete(cellIndex);
      return { ...prev, userPlacements: newPlacements };
    });
  }, []);

  // Submit placements and calculate score
  const submitPlacements = useCallback((): { attempts: PlacementAttempt[]; score: ScoreResult } | null => {
    if (!config) return null;

    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = Date.now() - startTimeRef.current;
    const remainingMs = Math.max(0, config.recallTimeMs - elapsed);

    // Build attempts by comparing user placements against correct ones
    const attempts: PlacementAttempt[] = state.placements.map((correct) => {
      const userObj = state.userPlacements.get(correct.cellIndex);
      const isCorrect = userObj?.id === correct.object.id;

      // Find where user placed this object (if anywhere)
      let placedCellIndex = -1;
      for (const [cell, obj] of state.userPlacements) {
        if (obj.id === correct.object.id) {
          placedCellIndex = cell;
          break;
        }
      }

      return {
        objectId: correct.object.id,
        placedCellIndex,
        correctCellIndex: correct.cellIndex,
        isCorrect,
      };
    });

    const score = calculateScore(attempts, config, remainingMs);

    setState((prev) => ({
      ...prev,
      phase: 'submitted',
      timeRemainingMs: remainingMs,
      score,
    }));

    return { attempts, score };
  }, [config, state.placements, state.userPlacements]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Pause timer on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && state.phase === 'recall') {
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

  return {
    ...state,
    startMemorize,
    placeObject,
    removeObject,
    submitPlacements,
  };
}
