import type { SoundDefinition } from '@/audio/types';

/**
 * Arrows game sound catalogue.
 * Sounds use generated tones as fallback when audio files are not available.
 */
export const soundRegistry = {
  // === SFX (gameplay) ===
  arrowTap: {
    path: '/audio/arrows/arrow-tap.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.8,
    sceneTags: ['gameplay'],
  },
  arrowCorrect: {
    path: '/audio/arrows/arrow-correct.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.85,
    sceneTags: ['gameplay'],
  },
  arrowIncorrect: {
    path: '/audio/arrows/arrow-incorrect.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.7,
    sceneTags: ['gameplay'],
  },
  combo: {
    path: '/audio/arrows/combo.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.75,
    sceneTags: ['gameplay'],
  },

  // === UI ===
  uiClick: {
    path: '/audio/shared/ui-click.wav',
    category: 'ui',
    preload: true,
    defaultVolume: 0.6,
    sceneTags: ['menu', 'gameplay'],
  },
  uiBack: {
    path: '/audio/shared/ui-back.wav',
    category: 'ui',
    preload: false,
    defaultVolume: 0.5,
    sceneTags: ['menu'],
  },

  // === Game events ===
  levelComplete: {
    path: '/audio/arrows/level-complete.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.9,
    sceneTags: ['gameplay'],
  },
  gameOver: {
    path: '/audio/arrows/game-over.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.8,
    sceneTags: ['gameplay'],
  },
  countdown: {
    path: '/audio/arrows/countdown.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.65,
    sceneTags: ['gameplay'],
  },
  timerWarning: {
    path: '/audio/arrows/timer-warning.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.7,
    sceneTags: ['gameplay'],
  },
  hint: {
    path: '/audio/arrows/hint.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.6,
    sceneTags: ['gameplay'],
  },
  undo: {
    path: '/audio/arrows/undo.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.5,
    sceneTags: ['gameplay'],
  },
  star: {
    path: '/audio/arrows/star.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.75,
    sceneTags: ['gameplay'],
  },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
