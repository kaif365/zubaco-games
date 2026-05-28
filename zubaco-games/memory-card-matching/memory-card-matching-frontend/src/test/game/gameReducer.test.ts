import { describe, it, expect } from 'vitest';
import { reducer } from '@/game/useMemoryGame';
import { GAME_STATES } from '@/constants/game.constants';
import type { LevelCard, LevelData } from '@/models/game.types';

const makeCard = (id: string, pairId: string): LevelCard => ({
  id,
  pairId,
  contentType: 'symbol',
  content: '♠',
  imageUrl: null,
});

const makeLevelData = (cards: LevelCard[], levelIndex = 0): LevelData => ({
  levelIndex,
  gridRows: 4,
  gridColumns: 4,
  cardContentType: 'symbol',
  previewDurationSeconds: 3,
  mismatchDisplayDurationSeconds: 1,
  cards,
});

const twoCards = [makeCard('pair-0-a', 'pair-0'), makeCard('pair-0-b', 'pair-0')];
const fourCards = [
  makeCard('pair-0-a', 'pair-0'),
  makeCard('pair-0-b', 'pair-0'),
  makeCard('pair-1-a', 'pair-1'),
  makeCard('pair-1-b', 'pair-1'),
];

const twoLevelData = makeLevelData(twoCards);
const fourLevelData = makeLevelData(fourCards);

const SESSION_ID = 'test-session';
const TOTAL_LEVELS = 1;
const GAME_TIME = 120;

const initialState = {
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
};

const initAction = (levelData: LevelData, totalLevels = TOTAL_LEVELS) => ({
  type: 'INIT' as const,
  sessionId: SESSION_ID,
  totalLevels,
  gameTimeLimitSeconds: GAME_TIME,
  levelData,
});

describe('reducer — INIT', () => {
  it('sets gameState to PREVIEW', () => {
    const state = reducer(initialState, initAction(twoLevelData));
    expect(state.gameState).toBe(GAME_STATES.PREVIEW);
  });

  it('starts cards face-down; PREVIEW_FLIP_UP flips them all face-up', () => {
    const afterInit = reducer(initialState, initAction(twoLevelData));
    expect(afterInit.cards.every((c) => !c.isFlipped)).toBe(true);

    const afterFlip = reducer(afterInit, { type: 'PREVIEW_FLIP_UP' });
    expect(afterFlip.cards.every((c) => c.isFlipped)).toBe(true);
  });

  it('sets timeRemaining from gameTimeLimitSeconds', () => {
    const state = reducer(initialState, initAction(twoLevelData));
    expect(state.timeRemaining).toBe(GAME_TIME);
  });

  it('stores sessionId and level info', () => {
    const state = reducer(initialState, initAction(twoLevelData));
    expect(state.sessionId).toBe(SESSION_ID);
    expect(state.totalLevels).toBe(TOTAL_LEVELS);
    expect(state.currentLevelIndex).toBe(0);
  });

  it('resets selection state', () => {
    const state = reducer(initialState, initAction(twoLevelData));
    expect(state.firstSelectedId).toBeNull();
    expect(state.secondSelectedId).toBeNull();
  });

  it('respects resumeTimeRemaining when resuming a session', () => {
    const state = reducer(initialState, {
      ...initAction(twoLevelData),
      resumeTimeRemaining: 75,
    });
    expect(state.timeRemaining).toBe(75);
  });

  it('marks resumed matched pairs as isMatched', () => {
    const state = reducer(initialState, {
      ...initAction(twoLevelData),
      resumeMatchedPairs: [{ pairId: 'pair-0', timestamp: '2024-01-01T00:00:00.000Z' }],
    });
    expect(state.cards.every((c) => c.isMatched)).toBe(true);
  });

  it('skips preview for resumed session even when no matched/turned cards exist', () => {
    const state = reducer(initialState, {
      ...initAction(twoLevelData),
      isResumedSession: true,
      resumeMatchedPairs: [],
    });
    expect(state.gameState).toBe(GAME_STATES.PLAYING);
  });
});

describe('reducer — PREVIEW_END', () => {
  it('transitions to PLAYING', () => {
    const prev = reducer(initialState, initAction(twoLevelData));
    const state = reducer(prev, { type: 'PREVIEW_END' });
    expect(state.gameState).toBe(GAME_STATES.PLAYING);
  });

  it('flips all unmatched cards face down', () => {
    const prev = reducer(initialState, initAction(twoLevelData));
    const state = reducer(prev, { type: 'PREVIEW_END' });
    expect(state.cards.every((c) => !c.isFlipped)).toBe(true);
  });
});

describe('reducer — TAP_CARD', () => {
  const playingState = (() => {
    let s = reducer(initialState, initAction(fourLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    return s;
  })();

  it('flips first tapped card and stores firstSelectedId', () => {
    const state = reducer(playingState, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    const card = state.cards.find((c) => c.id === 'pair-0-a')!;
    expect(card.isFlipped).toBe(true);
    expect(state.firstSelectedId).toBe('pair-0-a');
    expect(state.gameState).toBe(GAME_STATES.PLAYING);
  });

  it('ignores tap on already flipped card', () => {
    let s = reducer(playingState, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    expect(s.firstSelectedId).toBe('pair-0-a');
    expect(s.secondSelectedId).toBeNull();
  });

  it('ignores tap when not in PLAYING state', () => {
    const state = reducer(playingState, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    const checkingState = { ...state, gameState: GAME_STATES.CHECKING_MATCH };
    const next = reducer(checkingState, { type: 'TAP_CARD', cardId: 'pair-0-b' });
    expect(next.secondSelectedId).toBeNull();
  });

  it('moves to CHECKING_MATCH on second different card tap', () => {
    let s = reducer(playingState, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-1-a' });
    expect(s.gameState).toBe(GAME_STATES.CHECKING_MATCH);
    expect(s.secondSelectedId).toBe('pair-1-a');
    expect(s.isAnimating).toBe(true);
  });

  it('ignores tap on matched card', () => {
    const withMatched = {
      ...playingState,
      cards: playingState.cards.map((c) =>
        c.id === 'pair-0-a' ? { ...c, isMatched: true, isFlipped: true } : c,
      ),
    };
    const state = reducer(withMatched, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    expect(state.firstSelectedId).toBeNull();
  });

  it('ignores tap when isAnimating', () => {
    const animatingState = { ...playingState, isAnimating: true };
    const state = reducer(animatingState, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    expect(state.firstSelectedId).toBeNull();
  });
});

describe('reducer — MATCH_CONFIRMED', () => {
  it('marks both cards as matched and stays PLAYING when pairs remain', () => {
    let s = reducer(initialState, initAction(fourLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-b' });
    s = reducer(s, { type: 'MATCH_CONFIRMED', firstId: 'pair-0-a', secondId: 'pair-0-b' });

    const matched = s.cards.filter((c) => c.isMatched);
    expect(matched).toHaveLength(2);
    expect(s.gameState).toBe(GAME_STATES.PLAYING);
    expect(s.isAnimating).toBe(false);
    expect(s.firstSelectedId).toBeNull();
    expect(s.secondSelectedId).toBeNull();
  });

  it('transitions to FINISHED when all pairs matched on last level', () => {
    let s = reducer(initialState, initAction(twoLevelData, 1));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-b' });
    s = reducer(s, { type: 'MATCH_CONFIRMED', firstId: 'pair-0-a', secondId: 'pair-0-b' });

    expect(s.gameState).toBe(GAME_STATES.FINISHED);
    expect(s.gameOverStats).not.toBeNull();
    expect(s.gameOverStats?.result).toBe('win');
  });

  it('transitions to LEVEL_TRANSITION when all pairs matched and more levels remain', () => {
    let s = reducer(initialState, initAction(twoLevelData, 3));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-b' });
    s = reducer(s, { type: 'MATCH_CONFIRMED', firstId: 'pair-0-a', secondId: 'pair-0-b' });

    expect(s.gameState).toBe(GAME_STATES.LEVEL_TRANSITION);
    expect(s.gameOverStats).toBeNull();
  });
});

describe('reducer — LOAD_NEXT_LEVEL', () => {
  it('resets cards and transitions to PREVIEW; cards start face-down until PREVIEW_FLIP_UP', () => {
    let s = reducer(initialState, initAction(twoLevelData, 3));
    s = reducer(s, { type: 'PREVIEW_END' });
    const nextLevel = makeLevelData(twoCards, 1);
    s = reducer(s, { type: 'LOAD_NEXT_LEVEL', levelData: nextLevel });

    expect(s.gameState).toBe(GAME_STATES.PREVIEW);
    expect(s.currentLevelIndex).toBe(1);
    expect(s.cards.every((c) => !c.isFlipped)).toBe(true);
    expect(s.cards.every((c) => !c.isMatched)).toBe(true);
    expect(s.firstSelectedId).toBeNull();

    const afterFlip = reducer(s, { type: 'PREVIEW_FLIP_UP' });
    expect(afterFlip.cards.every((c) => c.isFlipped)).toBe(true);
  });
});

describe('reducer — MISMATCH_FLIP_BACK + MISMATCH_DONE', () => {
  it('MISMATCH_FLIP_BACK flips both cards down', () => {
    let s = reducer(initialState, initAction(fourLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-1-a' });
    s = reducer(s, { type: 'MISMATCH_FLIP_BACK', firstId: 'pair-0-a', secondId: 'pair-1-a' });

    const card0 = s.cards.find((c) => c.id === 'pair-0-a')!;
    const card1 = s.cards.find((c) => c.id === 'pair-1-a')!;
    expect(card0.isFlipped).toBe(false);
    expect(card1.isFlipped).toBe(false);
    expect(s.isAnimating).toBe(true);
  });

  it('MISMATCH_DONE clears selection and returns to PLAYING', () => {
    let s = reducer(initialState, initAction(fourLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-0-a' });
    s = reducer(s, { type: 'TAP_CARD', cardId: 'pair-1-a' });
    s = reducer(s, { type: 'MISMATCH_FLIP_BACK', firstId: 'pair-0-a', secondId: 'pair-1-a' });
    s = reducer(s, { type: 'MISMATCH_DONE' });

    expect(s.gameState).toBe(GAME_STATES.PLAYING);
    expect(s.isAnimating).toBe(false);
    expect(s.firstSelectedId).toBeNull();
    expect(s.secondSelectedId).toBeNull();
  });
});

describe('reducer — TICK', () => {
  it('decrements timeRemaining by 1 during PLAYING', () => {
    let s = reducer(initialState, initAction(twoLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    const before = s.timeRemaining;
    s = reducer(s, { type: 'TICK' });
    expect(s.timeRemaining).toBe(before - 1);
  });

  it('does not go below 0', () => {
    let s = reducer(initialState, initAction(twoLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = { ...s, timeRemaining: 0 };
    s = reducer(s, { type: 'TICK' });
    expect(s.timeRemaining).toBe(0);
  });

  it('ignores TICK when not in PLAYING or PREVIEW state', () => {
    let s = reducer(initialState, initAction(twoLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    // Force into CHECKING_MATCH — TICK is a no-op outside PLAYING/PREVIEW
    const checkingState = { ...s, gameState: GAME_STATES.CHECKING_MATCH };
    const before = checkingState.timeRemaining;
    const next = reducer(checkingState, { type: 'TICK' });
    expect(next.timeRemaining).toBe(before);
  });
});

describe('reducer — GAME_END', () => {
  it('sets FINISHED state with lose result', () => {
    let s = reducer(initialState, initAction(twoLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = reducer(s, { type: 'GAME_END', result: 'lose' });

    expect(s.gameState).toBe(GAME_STATES.FINISHED);
    expect(s.gameOverStats?.result).toBe('lose');
    expect(s.gameOverStats?.finalScore).toBe(0);
  });

  it('is idempotent — ignores GAME_END when already FINISHED', () => {
    let s = reducer(initialState, initAction(twoLevelData));
    s = reducer(s, { type: 'PREVIEW_END' });
    s = reducer(s, { type: 'GAME_END', result: 'lose' });
    const before = s.gameOverStats;
    s = reducer(s, { type: 'GAME_END', result: 'win' });
    expect(s.gameOverStats).toEqual(before);
  });
});
