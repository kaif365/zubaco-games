import { describe, it, expect } from 'vitest';
import {
  APP_SCREENS,
  GAME_STATES,
  FLIP_ANIMATION_DURATION_MS,
  CARD_ASPECT_RATIO,
  SYMBOLS,
  JEWEL_PALETTE,
  GOLD,
  GOLD_LIGHT,
  GOLD_DIM,
  QUERY_KEYS,
  ANALYTICS_EVENTS,
} from '@/constants/game.constants';

describe('APP_SCREENS', () => {
  it('has start, demo, gameplay, gameover values', () => {
    expect(APP_SCREENS.START).toBe('start');
    expect(APP_SCREENS.DEMO).toBe('demo');
    expect(APP_SCREENS.GAMEPLAY).toBe('gameplay');
    expect(APP_SCREENS.GAME_OVER).toBe('gameover');
  });
});

describe('GAME_STATES', () => {
  it('has all six states with correct string values', () => {
    expect(GAME_STATES.LOADING).toBe('loading');
    expect(GAME_STATES.PREVIEW).toBe('preview');
    expect(GAME_STATES.PLAYING).toBe('playing');
    expect(GAME_STATES.CHECKING_MATCH).toBe('checkingMatch');
    expect(GAME_STATES.LEVEL_TRANSITION).toBe('levelTransition');
    expect(GAME_STATES.FINISHED).toBe('finished');
  });
});

describe('FLIP_ANIMATION_DURATION_MS', () => {
  it('is a positive number', () => {
    expect(FLIP_ANIMATION_DURATION_MS).toBeGreaterThan(0);
  });
});

describe('CARD_ASPECT_RATIO', () => {
  it('is greater than 1 (taller than wide)', () => {
    expect(CARD_ASPECT_RATIO).toBeGreaterThan(1);
  });
});

describe('SYMBOLS', () => {
  it('has at least 24 symbols', () => {
    expect(SYMBOLS.length).toBeGreaterThanOrEqual(24);
  });

  it('all entries are non-empty strings', () => {
    SYMBOLS.forEach((s) => expect(typeof s).toBe('string'));
    SYMBOLS.forEach((s) => expect(s.length).toBeGreaterThan(0));
  });

  it('has no duplicates', () => {
    expect(new Set(SYMBOLS).size).toBe(SYMBOLS.length);
  });
});

describe('JEWEL_PALETTE', () => {
  it('has at least 8 entries', () => {
    expect(JEWEL_PALETTE.length).toBeGreaterThanOrEqual(8);
  });

  it('each entry has bg and dark hex strings', () => {
    JEWEL_PALETTE.forEach(({ bg, dark }) => {
      expect(bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(dark).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('gold color constants', () => {
  it('GOLD, GOLD_LIGHT, GOLD_DIM are valid hex strings', () => {
    [GOLD, GOLD_LIGHT, GOLD_DIM].forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('QUERY_KEYS', () => {
  it('gameConfig key is a stable array', () => {
    expect(QUERY_KEYS.gameConfig).toEqual(['gameConfig']);
  });
});

describe('ANALYTICS_EVENTS', () => {
  it('has all expected event names', () => {
    expect(ANALYTICS_EVENTS.GAME_STARTED).toBe('game_started');
    expect(ANALYTICS_EVENTS.CARD_FLIPPED).toBe('card_flipped');
    expect(ANALYTICS_EVENTS.PAIR_MATCHED).toBe('pair_matched');
    expect(ANALYTICS_EVENTS.PAIR_MISMATCHED).toBe('pair_mismatched');
    expect(ANALYTICS_EVENTS.LEVEL_COMPLETE).toBe('level_complete');
    expect(ANALYTICS_EVENTS.GAME_WON).toBe('game_won');
    expect(ANALYTICS_EVENTS.GAME_LOST).toBe('game_lost');
  });
});
