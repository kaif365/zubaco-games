import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { AudioManager } from '@/audio/AudioManager';
import { soundRegistry, type SoundKey } from '@/audio/soundRegistry';
import type { PlaySoundOptions, SoundCategory, VolumeState } from '@/audio/types';

export interface AudioContextValue {
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

const isTestEnv = import.meta.env.MODE === 'test';

export function AudioProvider({ children }: AudioProviderProps) {
  const [manager] = useState(() => new AudioManager<SoundKey>({ registry: soundRegistry }));
  const [ready, setReady] = useState(isTestEnv);
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMutedState] = useState(() => manager.getMuted());
  const [volume, setVolume] = useState(() => manager.getVolume());

  useEffect(() => {
    let mounted = true;
    if (isTestEnv) {
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
  }, [manager]);

  useEffect(() => {
    if (isTestEnv) return;

    const unlock = () => {
      void manager.unlock().then(() => {
        setUnlocked(manager.unlocked);
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
      void manager.unlock().then(() => {
        setUnlocked(manager.unlocked);
      });
    };
    document.addEventListener('visibilitychange', unlockOnVisible);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', unlockOnVisible);
    };
  }, [manager]);

  const syncVolume = useCallback(() => {
    setVolume(manager.getVolume());
    setMutedState(manager.getMuted());
  }, [manager]);

  const value = useMemo<AudioContextValue>(
    () => ({
      ready,
      unlocked,
      muted,
      volume,
      unlockAudio: async () => {
        await manager.unlock();
        setUnlocked(manager.unlocked);
      },
      preloadAll: () => manager.preloadAll(),
      preloadSounds: (keys) => manager.preloadSounds(keys),
      preloadScene: (sceneTag) => manager.preloadByScene(sceneTag),
      play: (key, options) => manager.play(key, options),
      stopSound: (key) => {
        manager.stopSound(key);
      },
      stopByInstance: (instanceId) => {
        manager.stopByInstance(instanceId);
      },
      stopAll: () => {
        manager.stopAll();
      },
      pauseAll: () => {
        manager.pauseAll();
      },
      resumeAll: () => manager.resumeAll(),
      setMuted: (nextMuted) => {
        manager.setMuted(nextMuted);
        syncVolume();
      },
      toggleMuted: () => {
        manager.toggleMuted();
        syncVolume();
      },
      setMasterVolume: (value) => {
        manager.setMasterVolume(value);
        syncVolume();
      },
      setCategoryVolume: (category, value) => {
        manager.setCategoryVolume(category, value);
        syncVolume();
      },
    }),
    [manager, muted, ready, syncVolume, unlocked, volume],
  );

  return <AudioContextState.Provider value={value}>{children}</AudioContextState.Provider>;
}

// Provider + context hook must live together; Fast Refresh only tracks component exports.
// eslint-disable-next-line react-refresh/only-export-components -- paired context hook
export function useAudioContextValue(): AudioContextValue {
  const context = useContext(AudioContextState);
  if (!context) throw new Error('useAudioContextValue must be used inside AudioProvider');
  return context;
}
