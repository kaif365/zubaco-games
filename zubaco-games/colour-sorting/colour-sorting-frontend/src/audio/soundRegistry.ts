import type { SoundDefinition } from '@/audio/types';

/**
 * Colour-Sorting game sound catalogue.
 */
export const soundRegistry = {
  // === SFX (gameplay) ===
  ballPick: {
    path: '/audio/colour-sorting/ball-pick.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.8,
    sceneTags: ['gameplay'],
  },
  ballDrop: {
    path: '/audio/colour-sorting/ball-drop.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.85,
    sceneTags: ['gameplay'],
  },
  ballError: {
    path: '/audio/colour-sorting/ball-error.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.7,
    sceneTags: ['gameplay'],
  },
  tubeSorted: {
    path: '/audio/colour-sorting/tube-sorted.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.85,
    sceneTags: ['gameplay'],
  },
  combo: {
    path: '/audio/colour-sorting/combo.wav',
    category: 'sfx',
    preload: false,
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
    path: '/audio/colour-sorting/level-complete.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.9,
    sceneTags: ['gameplay'],
  },
  gameOver: {
    path: '/audio/colour-sorting/game-over.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.8,
    sceneTags: ['gameplay'],
  },
  hint: {
    path: '/audio/colour-sorting/hint.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.6,
    sceneTags: ['gameplay'],
  },
  undo: {
    path: '/audio/colour-sorting/undo.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.5,
    sceneTags: ['gameplay'],
  },
  star: {
    path: '/audio/colour-sorting/star.wav',
    category: 'sfx',
    preload: false,
    defaultVolume: 0.75,
    sceneTags: ['gameplay'],
  },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
