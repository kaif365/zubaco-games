import { useReducer, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { MatchedPairEntry, MemoryCard, LevelData, GameState, GameOverStats } from '@/models/game.types';
import {
  allPairsMatched,
  flipAllCards,
  markCardsMatched,
  flipCardsDown,
  countMatchedPairs,
} from '@/game/gameUtils';
import { FLIP_ANIMATION_DURATION_MS, GAME_STATES } from '@/constants/game.constants';

interface State {
  sessionId: string | null;
  cards: MemoryCard[];
  gameState: GameState;
  currentLevelData: LevelData | null;
  currentLevelIndex: number;
  totalLevels: number;
  gameTimeLimitSeconds: number;
  firstSelectedId: string | null;
  secondSelectedId: string | null;
  timeRemaining: number;
  isAnimating: boolean;
  gameOverStats: GameOverStats | null;
  previewFlipped: boolean;
  matchedPairEntries: MatchedPairEntry[];
}

type Action =
  | {
      type: 'INIT';
      sessionId: string;
      totalLevels: number;
      gameTimeLimitSeconds: number;
      levelData: LevelData;
      isResumedSession?: boolean;
      resumeTimeRemaining?: number;
      resumeMatchedPairs?: MatchedPairEntry[];
    }
  | { type: 'PREVIEW_FLIP_UP' }
  | { type: 'PREVIEW_END' }
  | { type: 'TIME_SYNC'; timeRemaining: number }
  | { type: 'TAP_CARD'; cardId: string }
  | { type: 'MATCH_CONFIRMED'; firstId: string; secondId: string; timestamp: string }
  | { type: 'MISMATCH_FLIP_BACK'; firstId: string; secondId: string }
  | { type: 'MISMATCH_DONE' }
  | { type: 'TICK' }
  | { type: 'LOAD_NEXT_LEVEL'; levelData: LevelData }
  | { type: 'GAME_END'; result: 'win' | 'lose' };

const initialState: State = {
  sessionId: null,
  cards: [],
  gameState: GAME_STATES.LOADING,
  currentLevelData: null,
  currentLevelIndex: 0,
  totalLevels: 0,
  gameTimeLimitSeconds: 0,
  firstSelectedId: null,
  secondSelectedId: null,
  timeRemaining: 0,
  isAnimating: false,
  gameOverStats: null,
  previewFlipped: false,
  matchedPairEntries: [],
};

const buildLoseStats = (state: State): GameOverStats => ({
  result: 'lose',
  finalScore: 0,
  rank: 0,
  timeRemaining: state.timeRemaining,
  timeTaken: state.gameTimeLimitSeconds - state.timeRemaining,
  levelsCompleted: state.currentLevelIndex,
  totalLevels: state.totalLevels,
});

/**
 * Pure reducer that drives all multi-level memory-game state transitions.
 *
 * @param {State} state - The current game state.
 * @param {Action} action - The dispatched action.
 *
 * @returns {State} The next game state.
 */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT': {
      const resumePairIds = new Set(action.resumeMatchedPairs?.map((p) => p.pairId) ?? []);
      const turnedCountsByPair = new Map<string, number>();
      for (const card of action.levelData.cards) {
        if (!card.isTurned) continue;
        turnedCountsByPair.set(card.pairId, (turnedCountsByPair.get(card.pairId) ?? 0) + 1);
      }
      // On resume, backend may return already-solved pairs as both cards `isTurned=true`
      // even when `matchedPairs` is empty. Treat those pairs as matched in client logic.
      const restoredMatchedPairIds = new Set(resumePairIds);
      for (const [pairId, turnedCount] of turnedCountsByPair.entries()) {
        if (turnedCount >= 2) restoredMatchedPairIds.add(pairId);
      }
      const resumedTurnedCards = action.levelData.cards.filter(
        (card) => card.isTurned && !restoredMatchedPairIds.has(card.pairId),
      );
      // Backend `isTurned` is authoritative visual state on resume.
      // Do not re-enter client-side match checking from this state, otherwise
      // turned unmatched cards from `current` will flip back again.
      const firstSelectedId = resumedTurnedCards.length === 1 ? resumedTurnedCards[0].id : null;
      const hasResumeState = restoredMatchedPairIds.size > 0 || resumedTurnedCards.length > 0;
      const cards = action.levelData.cards.map((c) => ({
        ...c,
        isFlipped: restoredMatchedPairIds.has(c.pairId) || Boolean(c.isTurned),
        isMatched: restoredMatchedPairIds.has(c.pairId),
      }));
      const allMatchedOnInit = allPairsMatched(cards);
      const isLastLevelOnInit = action.levelData.levelIndex + 1 >= action.totalLevels;
      const seenPairIds = new Set<string>();
      const matchedPairEntries: MatchedPairEntry[] = (action.resumeMatchedPairs ?? []).filter((entry) => {
        if (seenPairIds.has(entry.pairId)) return false;
        seenPairIds.add(entry.pairId);
        return true;
      });
      if (allMatchedOnInit) {
        if (isLastLevelOnInit) {
          return {
            ...initialState,
            sessionId: action.sessionId,
            totalLevels: action.totalLevels,
            gameTimeLimitSeconds: action.gameTimeLimitSeconds,
            timeRemaining: action.resumeTimeRemaining ?? action.gameTimeLimitSeconds,
            currentLevelIndex: action.levelData.levelIndex,
            currentLevelData: action.levelData,
            cards,
            gameState: GAME_STATES.FINISHED,
            previewFlipped: false,
            matchedPairEntries,
            firstSelectedId: null,
            secondSelectedId: null,
            isAnimating: false,
            gameOverStats: {
              result: 'win',
              finalScore: 0,
              rank: 0,
              timeRemaining: action.resumeTimeRemaining ?? action.gameTimeLimitSeconds,
              timeTaken: action.gameTimeLimitSeconds - (action.resumeTimeRemaining ?? action.gameTimeLimitSeconds),
              levelsCompleted: action.levelData.levelIndex + 1,
              totalLevels: action.totalLevels,
            },
          };
        }
        return {
          ...initialState,
          sessionId: action.sessionId,
          totalLevels: action.totalLevels,
          gameTimeLimitSeconds: action.gameTimeLimitSeconds,
          timeRemaining: action.resumeTimeRemaining ?? action.gameTimeLimitSeconds,
          currentLevelIndex: action.levelData.levelIndex,
          currentLevelData: action.levelData,
          cards,
          gameState: GAME_STATES.LEVEL_TRANSITION,
          previewFlipped: false,
          matchedPairEntries,
          firstSelectedId: null,
          secondSelectedId: null,
          isAnimating: false,
        };
      }
      return {
        ...initialState,
        sessionId: action.sessionId,
        totalLevels: action.totalLevels,
        gameTimeLimitSeconds: action.gameTimeLimitSeconds,
        timeRemaining: action.resumeTimeRemaining ?? action.gameTimeLimitSeconds,
        currentLevelIndex: action.levelData.levelIndex,
        currentLevelData: action.levelData,
        cards,
        gameState:
          action.isResumedSession || hasResumeState
            ? GAME_STATES.PLAYING
            : GAME_STATES.PREVIEW,
        previewFlipped: false,
        matchedPairEntries,
        firstSelectedId,
        secondSelectedId: null,
        isAnimating: false,
      };
    }

    case 'LOAD_NEXT_LEVEL': {
      const cards = action.levelData.cards.map((c) => ({
        ...c,
        isFlipped: false,
        isMatched: false,
      }));
      return {
        ...state,
        cards,
        currentLevelIndex: action.levelData.levelIndex,
        currentLevelData: action.levelData,
        firstSelectedId: null,
        secondSelectedId: null,
        isAnimating: false,
        gameState: GAME_STATES.PREVIEW,
        previewFlipped: false,
        matchedPairEntries: [],
      };
    }

    case 'PREVIEW_FLIP_UP':
      return {
        ...state,
        cards: flipAllCards(state.cards, true),
        previewFlipped: true,
      };

    case 'PREVIEW_END':
      return {
        ...state,
        gameState: GAME_STATES.PLAYING,
        cards: flipAllCards(state.cards, false),
        previewFlipped: false,
      };

    case 'TAP_CARD': {
      const card = state.cards.find((c) => c.id === action.cardId);
      if (!card || card.isFlipped || card.isMatched || state.isAnimating) return state;
      if (state.gameState !== GAME_STATES.PLAYING) return state;

      const flipped = state.cards.map((c) =>
        c.id === action.cardId ? { ...c, isFlipped: true } : c,
      );

      if (!state.firstSelectedId) {
        return { ...state, cards: flipped, firstSelectedId: action.cardId };
      }

      if (state.firstSelectedId === action.cardId) return state;

      return {
        ...state,
        cards: flipped,
        secondSelectedId: action.cardId,
        gameState: GAME_STATES.CHECKING_MATCH,
        isAnimating: true,
      };
    }

    case 'MATCH_CONFIRMED': {
      const updatedCards = markCardsMatched(state.cards, action.firstId, action.secondId);
      const allMatched = allPairsMatched(updatedCards);
      const matchedCard = state.cards.find((c) => c.id === action.firstId);
      const updatedEntries: MatchedPairEntry[] = matchedCard
        ? [...state.matchedPairEntries, { pairId: matchedCard.pairId, timestamp: action.timestamp }]
        : state.matchedPairEntries;

      if (!allMatched) {
        return {
          ...state,
          cards: updatedCards,
          gameState: GAME_STATES.PLAYING,
          isAnimating: false,
          firstSelectedId: null,
          secondSelectedId: null,
          matchedPairEntries: updatedEntries,
        };
      }

      const isLastLevel = state.currentLevelIndex + 1 >= state.totalLevels;

      if (isLastLevel) {
        return {
          ...state,
          cards: updatedCards,
          gameState: GAME_STATES.FINISHED,
          isAnimating: false,
          firstSelectedId: null,
          secondSelectedId: null,
          matchedPairEntries: updatedEntries,
          gameOverStats: {
            result: 'win',
            finalScore: 0,
            rank: 0,
            timeRemaining: state.timeRemaining,
            timeTaken: state.gameTimeLimitSeconds - state.timeRemaining,
            levelsCompleted: state.currentLevelIndex + 1,
            totalLevels: state.totalLevels,
          },
        };
      }

      return {
        ...state,
        cards: updatedCards,
        gameState: GAME_STATES.LEVEL_TRANSITION,
        isAnimating: false,
        firstSelectedId: null,
        secondSelectedId: null,
        matchedPairEntries: updatedEntries,
      };
    }

    case 'MISMATCH_FLIP_BACK':
      return {
        ...state,
        cards: flipCardsDown(state.cards, action.firstId, action.secondId),
        isAnimating: true,
      };

    case 'MISMATCH_DONE':
      return {
        ...state,
        gameState: GAME_STATES.PLAYING,
        isAnimating: false,
        firstSelectedId: null,
        secondSelectedId: null,
      };

    case 'TICK':
      if (state.gameState !== GAME_STATES.PLAYING && state.gameState !== GAME_STATES.PREVIEW) return state;
      {
        const nextTimeRemaining = Math.max(0, state.timeRemaining - 1);
        if (nextTimeRemaining === 0) {
          return {
            ...state,
            timeRemaining: 0,
            gameState: GAME_STATES.FINISHED,
            isAnimating: false,
            gameOverStats: buildLoseStats({ ...state, timeRemaining: 0 }),
          };
        }
        return { ...state, timeRemaining: nextTimeRemaining };
      }

    case 'TIME_SYNC':
      if (state.gameState !== GAME_STATES.PLAYING && state.gameState !== GAME_STATES.PREVIEW) return state;
      if (action.timeRemaining <= 0) {
        return {
          ...state,
          timeRemaining: 0,
          gameState: GAME_STATES.FINISHED,
          isAnimating: false,
          gameOverStats: buildLoseStats({ ...state, timeRemaining: 0 }),
        };
      }
      return { ...state, timeRemaining: action.timeRemaining };

    case 'GAME_END': {
      if (state.gameState === GAME_STATES.FINISHED) return state;
      return {
        ...state,
        gameState: GAME_STATES.FINISHED,
        isAnimating: false,
        gameOverStats: {
          result: action.result,
          finalScore: 0,
          rank: 0,
          timeRemaining: state.timeRemaining,
          timeTaken: state.gameTimeLimitSeconds - state.timeRemaining,
          levelsCompleted: action.result === 'win'
            ? state.currentLevelIndex + 1
            : state.currentLevelIndex,
          totalLevels: state.totalLevels,
        },
      };
    }

    default:
      return state;
  }
}

export interface MemoryGameControls {
  sessionId: string | null;
  cards: MemoryCard[];
  gameState: GameState;
  timeRemaining: number;
  isAnimating: boolean;
  gameOverStats: GameOverStats | null;
  matchedPairs: number;
  totalPairs: number;
  currentLevelIndex: number;
  totalLevels: number;
  currentLevelColumns: number;
  matchedPairEntries: MatchedPairEntry[];
  handleCardTap: (cardId: string) => void;
  initGame: (
    sessionId: string,
    totalLevels: number,
    gameTimeLimitSeconds: number,
    levelData: LevelData,
    isResumedSession?: boolean,
    resumeTimeRemaining?: number,
    resumeMatchedPairs?: MatchedPairEntry[],
  ) => void;
  loadNextLevel: (levelData: LevelData) => void;
  syncTime: (timeRemaining: number) => void;
}

/**
 * Manages multi-level memory-game logic: card state, timer, match checking,
 * level transitions, and game lifecycle.
 *
 * @returns {MemoryGameControls} Controls and state for driving the memory game UI.
 */
export function useMemoryGame(): MemoryGameControls {
  const [state, dispatch] = useReducer(reducer, initialState);

  const checkRef = useRef({
    firstSelectedId: state.firstSelectedId,
    secondSelectedId: state.secondSelectedId,
    cards: state.cards,
    currentLevelData: state.currentLevelData,
  });
  useLayoutEffect(() => {
    checkRef.current = {
      firstSelectedId: state.firstSelectedId,
      secondSelectedId: state.secondSelectedId,
      cards: state.cards,
      currentLevelData: state.currentLevelData,
    };
  });

  // Flip all cards face-up at preview start (delay lets face-down state render first)
  useEffect(() => {
    if (state.gameState !== GAME_STATES.PREVIEW || state.previewFlipped) return;
    const t = setTimeout(() => dispatch({ type: 'PREVIEW_FLIP_UP' }), 50);
    return () => clearTimeout(t);
  }, [state.gameState, state.previewFlipped]);

  // After flip-up, wait the full preview duration then flip cards back down
  useEffect(() => {
    if (state.gameState !== GAME_STATES.PREVIEW || !state.previewFlipped || !state.currentLevelData) return;
    const t = setTimeout(
      () => dispatch({ type: 'PREVIEW_END' }),
      state.currentLevelData.previewDurationSeconds * 1000,
    );
    return () => clearTimeout(t);
  }, [state.gameState, state.previewFlipped, state.currentLevelData]);

  // Countdown timer — runs during preview and playing so time is never frozen
  useEffect(() => {
    if (state.gameState !== GAME_STATES.PLAYING && state.gameState !== GAME_STATES.PREVIEW) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.gameState]);

  // Match check after both cards selected
  useEffect(() => {
    if (state.gameState !== GAME_STATES.CHECKING_MATCH) return;
    const { firstSelectedId, secondSelectedId, cards, currentLevelData } = checkRef.current;
    if (!firstSelectedId || !secondSelectedId || !currentLevelData) return;

    const first = cards.find((c) => c.id === firstSelectedId);
    const second = cards.find((c) => c.id === secondSelectedId);
    if (!first || !second) return;

    const isMatch = first.pairId === second.pairId;

    if (isMatch) {
      const t = setTimeout(() => {
        dispatch({ type: 'MATCH_CONFIRMED', firstId: firstSelectedId, secondId: secondSelectedId, timestamp: new Date().toISOString() });
      }, FLIP_ANIMATION_DURATION_MS);
      return () => clearTimeout(t);
    } else {
      const mismatchDelay =
        FLIP_ANIMATION_DURATION_MS + currentLevelData.mismatchDisplayDurationSeconds * 1000;
      const t = setTimeout(() => {
        dispatch({ type: 'MISMATCH_FLIP_BACK', firstId: firstSelectedId, secondId: secondSelectedId });
        setTimeout(() => dispatch({ type: 'MISMATCH_DONE' }), FLIP_ANIMATION_DURATION_MS);
      }, mismatchDelay);
      return () => clearTimeout(t);
    }
  }, [state.gameState]);

  const handleCardTap = useCallback((cardId: string) => {
    dispatch({ type: 'TAP_CARD', cardId });
  }, []);

  const initGame = useCallback(
    (
      sessionId: string,
      totalLevels: number,
      gameTimeLimitSeconds: number,
      levelData: LevelData,
      isResumedSession?: boolean,
      resumeTimeRemaining?: number,
      resumeMatchedPairs?: MatchedPairEntry[],
    ) => {
      dispatch({
        type: 'INIT',
        sessionId,
        totalLevels,
        gameTimeLimitSeconds,
        levelData,
        isResumedSession,
        resumeTimeRemaining,
        resumeMatchedPairs,
      });
    },
    [],
  );

  const loadNextLevel = useCallback((levelData: LevelData) => {
    dispatch({ type: 'LOAD_NEXT_LEVEL', levelData });
  }, []);

  const syncTime = useCallback((timeRemaining: number) => {
    dispatch({ type: 'TIME_SYNC', timeRemaining });
  }, []);

  return {
    sessionId: state.sessionId,
    cards: state.cards,
    gameState: state.gameState,
    timeRemaining: state.timeRemaining,
    isAnimating: state.isAnimating,
    gameOverStats: state.gameOverStats,
    matchedPairs: countMatchedPairs(state.cards),
    totalPairs: Math.floor(state.cards.length / 2),
    currentLevelIndex: state.currentLevelIndex,
    totalLevels: state.totalLevels,
    currentLevelColumns: state.currentLevelData?.gridColumns ?? 4,
    matchedPairEntries: state.matchedPairEntries,
    handleCardTap,
    initGame,
    loadNextLevel,
    syncTime,
  };
}
