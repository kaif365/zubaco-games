export const APP_SCREENS = {
  START: 'start',
  MENU: 'menu',
  INSTRUCTIONS: 'instructions',
  DEMO: 'demo',
  GAMEPLAY: 'gameplay',
  GAME_OVER: 'gameover',
  LEVELS: 'levels',
  DAILY: 'daily',
  ACHIEVEMENTS: 'achievements',
  STATS: 'stats',
  SETTINGS: 'settings',
} as const satisfies Record<string, import('@/models/game.types').AppScreen>;

export const GAME_STATES = {
  LOADING: 'loading',
  PREVIEW: 'preview',
  PLAYING: 'playing',
  CHECKING_MATCH: 'checkingMatch',
  LEVEL_TRANSITION: 'levelTransition',
  FINISHED: 'finished',
} as const satisfies Record<string, import('@/models/game.types').GameState>;

export const FLIP_ANIMATION_DURATION_MS = 400;

export const LEVEL_COMPLETE_CELEBRATION_MS = 800;
export const ROUND_TRANSITION_DELAY_MS = 800;
export const DEMO_ROUND_TRANSITION_DELAY_MS = 1400;
export const DEMO_COMPLETE_DELAY_MS = 400;
export const CARD_ASPECT_RATIO = 1.35;

export const QUERY_KEYS = {
  gameConfig: ['gameConfig'] as const,
  stageContent: ['stageContent'] as const,
  demoLevels: ['demoLevels'] as const,
} as const;

export const SESSION_STORAGE_KEY = 'memory_card_session_id';
export const GAME_TYPE = 'MEMORY_CARD_MATCHING';

export const MIN_SAVE_PROGRESS_BATCH_CLICKS = 2;
export const MAX_SAVE_PROGRESS_BATCH_CLICKS = 8;
export const SAVE_PROGRESS_BATCH_CARD_RATIO = 0.25;

export const SYMBOLS: string[] = [
  '♠',
  '♥',
  '♦',
  '♣',
  '★',
  '◆',
  '▲',
  '●',
  '♬',
  '⚡',
  '🔥',
  '💎',
  '🌙',
  '🎯',
  '⚔️',
  '🛡️',
  '🔮',
  '🌊',
  '🎭',
  '👑',
  '🐉',
  '🦋',
  '🍀',
  '🌸',
];

export const JEWEL_PALETTE: Array<{ bg: string; dark: string }> = [
  { bg: '#1a2d4a', dark: '#0f1d30' },
  { bg: '#3a2008', dark: '#251408' },
  { bg: '#2e1010', dark: '#1c0a0a' },
  { bg: '#0f2d1c', dark: '#081c12' },
  { bg: '#1e1040', dark: '#120a28' },
  { bg: '#2e0f2e', dark: '#1c0a1c' },
  { bg: '#0a2828', dark: '#061818' },
  { bg: '#2c2808', dark: '#1c1808' },
  { bg: '#301820', dark: '#1e0e14' },
  { bg: '#0a2030', dark: '#061420' },
  { bg: '#281808', dark: '#180e04' },
  { bg: '#103018', dark: '#081e0e' },
];

export const GOLD = '#c8943a';
export const GOLD_LIGHT = '#e0b86a';
export const GOLD_DIM = '#8a6428';

export const ANALYTICS_EVENTS = {
  GAME_STARTED: 'game_started',
  CARD_FLIPPED: 'card_flipped',
  PAIR_MATCHED: 'pair_matched',
  PAIR_MISMATCHED: 'pair_mismatched',
  LEVEL_COMPLETE: 'level_complete',
  GAME_WON: 'game_won',
  GAME_LOST: 'game_lost',
} as const;
