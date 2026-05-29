import { useReducer, useEffect, useRef, useCallback } from 'react';
import { LEVELS } from '@/lib/game/levels';
import { Board, ArrowPiece, Level } from '@/lib/game/types';
import { buildBoard, canMove, removeArrow, isWon } from '@/lib/game/logic';

export const MAX_LIVES = 6;
const TIME_LIMITS: Record<number, number> = {
  1: 60000, 2: 60000, 3: 75000, 4: 90000, 5: 90000,
  6: 105000, 7: 105000, 8: 120000, 9: 120000, 10: 150000,
};

interface GameState {
  levelIndex: number;
  board: Board;
  moves: number;
  lives: number;
  status: 'playing' | 'won' | 'gameover';
  score: number;
  comboStreak: number;
  maxStreak: number;
  timeRemainingMs: number;
  timeLimitMs: number;
  undoStack: { board: Board; moves: number; lives: number; comboStreak: number }[];
  hintId: string | null;
}

type GameAction =
  | { type: 'REMOVE_ARROW'; id: string }
  | { type: 'WRONG_MOVE' }
  | { type: 'RESET_LEVEL' }
  | { type: 'NEXT_LEVEL' }
  | { type: 'GOTO_LEVEL'; index: number }
  | { type: 'UNDO' }
  | { type: 'TICK'; delta: number }
  | { type: 'USE_HINT' }
  | { type: 'TIME_UP' };

function getTimeLimit(levelIndex: number): number {
  return TIME_LIMITS[levelIndex + 1] || 90000;
}

function initState(levelIndex: number): GameState {
  const timeLimitMs = getTimeLimit(levelIndex);
  return {
    levelIndex,
    board: buildBoard(LEVELS[levelIndex] || LEVELS[0]),
    moves: 0,
    lives: MAX_LIVES,
    status: 'playing',
    score: 0,
    comboStreak: 0,
    maxStreak: 0,
    timeRemainingMs: timeLimitMs,
    timeLimitMs,
    undoStack: [],
    hintId: null,
  };
}

function calculateScore(level: number, movesUsed: number, timeRemainingMs: number, maxStreak: number): number {
  const baseScore = (level + 1) * 100;
  const timeBonus = Math.floor(timeRemainingMs / 1000) * 5;
  const streakBonus = maxStreak * 20;
  const efficiencyBonus = Math.max(0, 50 - movesUsed * 5);
  return baseScore + timeBonus + streakBonus + efficiencyBonus;
}

function findHintArrow(board: Board): string | null {
  for (const row of board) {
    for (const cell of row) {
      if (cell && canMove(cell, board)) return cell.id;
    }
  }
  return null;
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'REMOVE_ARROW': {
      const snapshot = { board: state.board, moves: state.moves, lives: state.lives, comboStreak: state.comboStreak };
      const newBoard = removeArrow(action.id, state.board);
      const comboStreak = state.comboStreak + 1;
      const maxStreak = Math.max(state.maxStreak, comboStreak);
      const won = isWon(newBoard);
      const score = won ? calculateScore(state.levelIndex, state.moves + 1, state.timeRemainingMs, maxStreak) : state.score;
      return {
        ...state,
        board: newBoard,
        moves: state.moves + 1,
        comboStreak,
        maxStreak,
        score,
        status: won ? 'won' : 'playing',
        undoStack: [...state.undoStack, snapshot],
        hintId: null,
      };
    }
    case 'WRONG_MOVE': {
      const lives = state.lives - 1;
      return {
        ...state,
        lives,
        comboStreak: 0,
        status: lives <= 0 ? 'gameover' : 'playing',
        hintId: null,
      };
    }
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        board: prev.board,
        moves: prev.moves,
        lives: prev.lives,
        comboStreak: prev.comboStreak,
        undoStack: state.undoStack.slice(0, -1),
        hintId: null,
      };
    }
    case 'TICK': {
      const remaining = Math.max(0, state.timeRemainingMs - action.delta);
      if (remaining <= 0) {
        return { ...state, timeRemainingMs: 0, status: 'gameover' };
      }
      return { ...state, timeRemainingMs: remaining };
    }
    case 'TIME_UP':
      return { ...state, timeRemainingMs: 0, status: 'gameover' };
    case 'USE_HINT': {
      const hintId = findHintArrow(state.board);
      return { ...state, hintId };
    }
    case 'RESET_LEVEL':
      return initState(state.levelIndex);
    case 'NEXT_LEVEL': {
      const next = Math.min(state.levelIndex + 1, LEVELS.length - 1);
      return initState(next);
    }
    case 'GOTO_LEVEL':
      return initState(action.index);
    default:
      return state;
  }
}

export function useArrowGame(initialLevel = 0) {
  const [state, dispatch] = useReducer(reducer, initialLevel, initState);
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Timer
  useEffect(() => {
    if (state.status !== 'playing') {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }
    lastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      dispatch({ type: 'TICK', delta });
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [state.status, state.levelIndex]);

  // Pause on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      } else if (!document.hidden && state.status === 'playing') {
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.status]);

  const removeArrowAction = useCallback((id: string) => dispatch({ type: 'REMOVE_ARROW', id }), []);
  const wrongMove = useCallback(() => dispatch({ type: 'WRONG_MOVE' }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const resetLevel = useCallback(() => dispatch({ type: 'RESET_LEVEL' }), []);
  const nextLevel = useCallback(() => dispatch({ type: 'NEXT_LEVEL' }), []);
  const gotoLevel = useCallback((index: number) => dispatch({ type: 'GOTO_LEVEL', index }), []);
  const useHint = useCallback(() => dispatch({ type: 'USE_HINT' }), []);

  return {
    state,
    removeArrow: removeArrowAction,
    wrongMove,
    undo,
    resetLevel,
    nextLevel,
    gotoLevel,
    useHint,
    levels: LEVELS,
  };
}
