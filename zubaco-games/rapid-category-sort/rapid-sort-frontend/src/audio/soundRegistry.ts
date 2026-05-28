import type { SoundDefinition } from '@/audio/types';

export const soundRegistry = {
  itemSwipe: { path: '/audio/rapid-sort/item-swipe.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  sortCorrect: { path: '/audio/rapid-sort/sort-correct.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  sortWrong: { path: '/audio/rapid-sort/sort-wrong.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  combo: { path: '/audio/rapid-sort/combo.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  levelComplete: { path: '/audio/rapid-sort/level-complete.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  gameOver: { path: '/audio/rapid-sort/game-over.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  timerWarning: { path: '/audio/rapid-sort/timer-warning.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  uiClick: { path: '/audio/rapid-sort/ui-click.wav', category: 'ui', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
