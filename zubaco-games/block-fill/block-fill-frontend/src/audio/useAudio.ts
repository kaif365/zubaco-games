import { useMemo } from 'react';

import { useAudioContextValue } from '@/audio/AudioProvider';
import type { SoundKey } from '@/audio/soundRegistry';
import type { PlaySoundOptions } from '@/audio/types';

export function useAudio() {
  return useAudioContextValue();
}

/**
 * Stable `{ play, stop }` for a single registry key (e.g. in a dedicated component).
 *
 * @param soundKey Registry key
 */
export function useSound(soundKey: SoundKey) {
  const audio = useAudio();
  return useMemo(
    () => ({
      play: (options?: PlaySoundOptions) => audio.play(soundKey, options),
      stop: () => {
        audio.stopSound(soundKey);
      },
    }),
    [audio, soundKey],
  );
}
