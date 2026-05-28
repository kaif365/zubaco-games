import type { SoundDefinition } from '@/audio/types';

export const soundRegistry = {
  cardFlip: { path: '/audio/memory-card/card-flip.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  cardMatch: { path: '/audio/memory-card/card-match.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  cardMismatch: { path: '/audio/memory-card/card-mismatch.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  combo: { path: '/audio/memory-card/combo.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  levelComplete: { path: '/audio/memory-card/level-complete.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  gameOver: { path: '/audio/memory-card/game-over.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  uiClick: { path: '/audio/memory-card/ui-click.wav', category: 'ui', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
