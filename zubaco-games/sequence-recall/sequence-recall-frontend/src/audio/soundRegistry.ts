import type { SoundDefinition } from '@/audio/types';

export const soundRegistry = {
  // Gameplay SFX
  tileGreen: {
    path: '/audio/sfx/type2/sound1.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-core',
  },
  tileRed: {
    path: '/audio/sfx/type2/sound2.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-core',
  },
  tileBlue: {
    path: '/audio/sfx/type2/sound3.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-core',
  },
  tileYellow: {
    path: '/audio/sfx/type2/sound4.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-core',
  },
  tileGreenRetro: {
    path: '/audio/sfx/type2/sound1.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-retro',
  },
  tileRedRetro: {
    path: '/audio/sfx/type2/sound2.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-retro',
  },
  tileBlueRetro: {
    path: '/audio/sfx/type2/sound3.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-retro',
  },
  tileYellowRetro: {
    path: '/audio/sfx/type2/sound4.mp3',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.9,
    sceneTags: ['sequence-recall'],
    pack: 'sequence-retro',
  },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
