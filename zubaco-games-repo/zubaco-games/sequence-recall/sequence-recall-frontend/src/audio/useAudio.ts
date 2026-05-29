import { useMemo } from 'react';

import { useAudioContextValue } from '@/audio/AudioProvider';
import type { SoundKey } from '@/audio/soundRegistry';

/**
 * Hook for audio.
 *
 * @returns {AudioContextValue} The result of useAudio.
 */
export function useAudio() {
  return useAudioContextValue();
}

/**
 * Hook for sound.
 *
 * @param {"tileGreen" | "tileRed" | "tileBlue" | "tileYellow" | "tileGreenRetro" | "tileRedRetro" | "tileBlueRetro" | "tileYellowRetro"} soundKey - The sound key.
 *
 * @returns {{ play: () => Promise<string | null>; stop: () => void; }} The result of useSound.
 */
export function useSound(soundKey: SoundKey) {
  const audio = useAudio();
  return useMemo(
    () => ({
      play: () => audio.play(soundKey),
      stop: () => {
        audio.stopSound(soundKey);
      },
    }),
    [audio, soundKey],
  );
}
