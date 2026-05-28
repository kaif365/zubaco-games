import type { SoundDefinition } from '@/audio/types';

export const soundRegistry = {
  stepForward: { path: '/audio/maze-navigation/step-forward.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  wallHit: { path: '/audio/maze-navigation/wall-hit.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  pathFound: { path: '/audio/maze-navigation/path-found.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  levelComplete: { path: '/audio/maze-navigation/level-complete.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  gameOver: { path: '/audio/maze-navigation/game-over.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  timerWarning: { path: '/audio/maze-navigation/timer-warning.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  uiClick: { path: '/audio/maze-navigation/ui-click.wav', category: 'ui', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
