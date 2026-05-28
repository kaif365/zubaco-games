import type { SoundDefinition } from '@/audio/types';

export const soundRegistry = {
  tileSlide: { path: '/audio/sliding-puzzle/tile-slide.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  puzzleSolve: { path: '/audio/sliding-puzzle/puzzle-solve.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  levelComplete: { path: '/audio/sliding-puzzle/level-complete.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  hint: { path: '/audio/sliding-puzzle/hint.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  undo: { path: '/audio/sliding-puzzle/undo.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  uiClick: { path: '/audio/sliding-puzzle/ui-click.wav', category: 'ui', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
