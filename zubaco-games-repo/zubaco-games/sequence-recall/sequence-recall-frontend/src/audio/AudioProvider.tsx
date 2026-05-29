import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { AudioManager } from '@/audio/AudioManager';
import { soundRegistry, type SoundKey } from '@/audio/soundRegistry';
import type { PlaySoundOptions, SoundCategory, VolumeState } from '@/audio/types';

interface AudioContextValue {
  ready: boolean;
  unlocked: boolean;
  muted: boolean;
  volume: VolumeState;
  unlockAudio: () => Promise<void>;
  preloadAll: () => Promise<void>;
  preloadSounds: (keys: readonly SoundKey[]) => Promise<void>;
  preloadScene: (sceneTag: string) => Promise<void>;
  play: (key: SoundKey, options?: PlaySoundOptions) => Promise<string | null>;
  stopSound: (key: SoundKey) => void;
  stopByInstance: (instanceId: string) => void;
  stopAll: () => void;
  pauseAll: () => void;
  resumeAll: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setMasterVolume: (value: number) => void;
  setCategoryVolume: (category: SoundCategory, value: number) => void;
}

const AudioContextState = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  children: ReactNode;
}

/**
 * Audio provider.
 *
 * @param {AudioProviderProps} props - Component props.
 * @param {string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined} props.children - The children.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function AudioProvider({ children }: AudioProviderProps) {
  const managerRef = useRef(new AudioManager<SoundKey>({ registry: soundRegistry }));
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMutedState] = useState(managerRef.current.getMuted());
  const [volume, setVolume] = useState(managerRef.current.getVolume());

  useEffect(() => {
    let mounted = true;
    const manager = managerRef.current;
    if (process.env.NODE_ENV === 'test') {
      setReady(true);
      return () => {
        mounted = false;
        manager.stopAll();
      };
    }
    void manager.initialize().then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
      manager.stopAll();
    };
  }, []);

  useEffect(() => {
    /**
     * Unlock.
     *
     * @returns {void} No return value.
     */
    const unlock = () => {
      void managerRef.current.unlock().then(() => {
        setUnlocked(managerRef.current.unlocked);
      });
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    const unlockOnVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void managerRef.current.unlock().then(() => {
        setUnlocked(managerRef.current.unlocked);
      });
    };
    document.addEventListener('visibilitychange', unlockOnVisible);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', unlockOnVisible);
    };
  }, []);

  const syncVolume = useCallback(() => {
    setVolume(managerRef.current.getVolume());
    setMutedState(managerRef.current.getMuted());
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      ready,
      unlocked,
      muted,
      volume,
      unlockAudio: async () => {
        await managerRef.current.unlock();
        setUnlocked(managerRef.current.unlocked);
      },
      preloadAll: () => managerRef.current.preloadAll(),
      preloadSounds: (keys) => managerRef.current.preloadSounds(keys),
      preloadScene: (sceneTag) => managerRef.current.preloadByScene(sceneTag),
      play: (key, options) => managerRef.current.play(key, options),
      stopSound: (key) => {
        managerRef.current.stopSound(key);
      },
      stopByInstance: (instanceId) => {
        managerRef.current.stopByInstance(instanceId);
      },
      stopAll: () => {
        managerRef.current.stopAll();
      },
      pauseAll: () => {
        managerRef.current.pauseAll();
      },
      resumeAll: () => managerRef.current.resumeAll(),
      setMuted: (nextMuted) => {
        managerRef.current.setMuted(nextMuted);
        syncVolume();
      },
      toggleMuted: () => {
        managerRef.current.toggleMuted();
        syncVolume();
      },
      setMasterVolume: (value) => {
        managerRef.current.setMasterVolume(value);
        syncVolume();
      },
      setCategoryVolume: (category, value) => {
        managerRef.current.setCategoryVolume(category, value);
        syncVolume();
      },
    }),
    [muted, ready, syncVolume, unlocked, volume],
  );

  return <AudioContextState.Provider value={value}>{children}</AudioContextState.Provider>;
}

/**
 * Hook for audio context value.
 *
 * @returns {AudioContextValue} The result of useAudioContextValue.
 */
export function useAudioContextValue() {
  const context = useContext(AudioContextState);
  if (!context) throw new Error('useAudioContextValue must be used inside AudioProvider');
  return context;
}
