import type { SoundDefinition } from '@/audio/types';

export const soundRegistry = {
  mirrorPlace: { path: '/audio/logic-reflector/mirror-place.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  beamHit: { path: '/audio/logic-reflector/beam-hit.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  beamMiss: { path: '/audio/logic-reflector/beam-miss.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  puzzleSolve: { path: '/audio/logic-reflector/puzzle-solve.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  levelComplete: { path: '/audio/logic-reflector/level-complete.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  hint: { path: '/audio/logic-reflector/hint.wav', category: 'sfx', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
  uiClick: { path: '/audio/logic-reflector/ui-click.wav', category: 'ui', preload: true, defaultVolume: 0.8, sceneTags: ['gameplay'] },
} as const satisfies Record<string, SoundDefinition>;

export type SoundKey = keyof typeof soundRegistry;
