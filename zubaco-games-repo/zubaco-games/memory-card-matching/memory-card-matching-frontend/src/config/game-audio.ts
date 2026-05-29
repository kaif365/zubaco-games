/**
 * Local audio under `public/audio/`.
 * BGM: "Comfortable Mystery 2" by Kevin MacLeod (https://incompetech.com) — CC BY 4.0.
 * Flip/tap: short soft UI tick (`flip.wav`, generated sine — not a cinematic sting).
 * Other SFX: Mixkit (https://mixkit.co/license/): match 2000, mismatch 2955, level complete 2020.
 * Sequence Recall FE has no background music; tile tones live only in that app’s registry.
 */
export const MEMORY_CARD_AUDIO = {
  bgm: '/audio/bgm.mp3',
  flip: '/audio/flip.wav',
  match: '/audio/match.mp3',
  mismatch: '/audio/mismatch.mp3',
  levelComplete: '/audio/level-complete.mp3',
} as const;

export const MEMORY_CARD_BGM_VOLUME = 0.35;
export const MEMORY_CARD_SFX_VOLUME = 0.55;
