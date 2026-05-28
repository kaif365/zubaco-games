import type { SoundDefinition } from '@/audio/types';

/**
 * Flow / block-fill SFX catalogue. Add keys + files here as needed.
 */
export const soundRegistry = {
  pathPickUp: {
    path: '/audio/flow/path-pickup.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.88,
    sceneTags: ['flow-puzzle'],
  },
  pathRelease: {
    path: '/audio/flow/path-release.wav',
    category: 'sfx',
    preload: true,
    defaultVolume: 0.55,
    sceneTags: ['flow-puzzle'],
  },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
