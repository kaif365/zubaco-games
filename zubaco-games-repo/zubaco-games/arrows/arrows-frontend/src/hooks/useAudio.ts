import { useCallback } from 'react';
import { useAudioContextValue } from '@/audio/AudioProvider';
import type { SoundKey } from '@/audio/soundRegistry';

type SoundType = 'correct' | 'incorrect' | 'tap' | 'complete' | 'countdown' | 'start';

/** Maps legacy sound names to new AudioManager registry keys */
const SOUND_MAP: Record<SoundType, SoundKey> = {
  correct: 'arrowCorrect',
  incorrect: 'arrowIncorrect',
  tap: 'arrowTap',
  complete: 'levelComplete',
  countdown: 'countdown',
  start: 'uiClick',
};

/**
 * Legacy-compatible useAudio hook.
 * Under the hood uses the new Howler-based AudioManager.
 */
export function useAudio() {
  const audio = useAudioContextValue();

  const play = useCallback(
    (sound: SoundType) => {
      const key = SOUND_MAP[sound];
      if (key) void audio.play(key);
    },
    [audio],
  );

  const isEnabled = useCallback(() => !audio.muted, [audio]);
  const setEnabled = useCallback(
    (enabled: boolean) => audio.setMuted(!enabled),
    [audio],
  );

  return { play, isEnabled, setEnabled };
}
