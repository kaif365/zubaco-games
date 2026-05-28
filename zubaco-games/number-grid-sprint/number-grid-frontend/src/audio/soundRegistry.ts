import type { SoundDefinition } from '@/audio/types';

export const soundRegistry = {
  numberTap: { path: '/audio/number-grid/number-tap.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  numberCorrect: { path: '/audio/number-grid/number-correct.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  numberWrong: { path: '/audio/number-grid/number-wrong.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  combo: { path: '/audio/number-grid/combo.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  levelComplete: { path: '/audio/number-grid/level-complete.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  gameOver: { path: '/audio/number-grid/game-over.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  timerWarning: { path: '/audio/number-grid/timer-warning.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  uiClick: { path: '/audio/number-grid/ui-click.wav', category: 'ui', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
