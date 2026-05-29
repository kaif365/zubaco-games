import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AudioManager } from '@/audio/AudioManager';
import { soundRegistry, type SoundKey } from '@/audio/soundRegistry';
import type { PlaySoundOptions, SoundCategory, VolumeState } from '@/audio/types';

export interface AudioContextValue { ready: boolean; unlocked: boolean; muted: boolean; volume: VolumeState; unlockAudio: () => Promise<void>; preloadAll: () => Promise<void>; preloadSounds: (keys: readonly SoundKey[]) => Promise<void>; preloadScene: (sceneTag: string) => Promise<void>; play: (key: SoundKey, options?: PlaySoundOptions) => Promise<string | null>; stopSound: (key: SoundKey) => void; stopByInstance: (instanceId: string) => void; stopAll: () => void; pauseAll: () => void; resumeAll: () => Promise<void>; setMuted: (muted: boolean) => void; toggleMuted: () => void; setMasterVolume: (value: number) => void; setCategoryVolume: (category: SoundCategory, value: number) => void; }

const AudioCtx = createContext<AudioContextValue | null>(null);
const isTestEnv = import.meta.env.MODE === 'test';

export function AudioProvider({ children }: { children: ReactNode }) {
  const [mgr] = useState(() => new AudioManager<SoundKey>({ registry: soundRegistry }));
  const [ready, setReady] = useState(isTestEnv);
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMutedState] = useState(() => mgr.getMuted());
  const [volume, setVolume] = useState(() => mgr.getVolume());

  useEffect(() => { let m = true; if (isTestEnv) return () => { m = false; mgr.stopAll(); }; void mgr.initialize().then(() => { if (m) setReady(true); }); return () => { m = false; mgr.stopAll(); }; }, [mgr]);
  useEffect(() => { if (isTestEnv) return; const unlock = () => { void mgr.unlock().then(() => setUnlocked(mgr.unlocked)); window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchstart', unlock); window.removeEventListener('keydown', unlock); }; window.addEventListener('pointerdown', unlock, { once: true }); window.addEventListener('touchstart', unlock, { once: true }); window.addEventListener('keydown', unlock, { once: true }); return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchstart', unlock); window.removeEventListener('keydown', unlock); }; }, [mgr]);

  const sync = useCallback(() => { setVolume(mgr.getVolume()); setMutedState(mgr.getMuted()); }, [mgr]);
  const value = useMemo<AudioContextValue>(() => ({ ready, unlocked, muted, volume, unlockAudio: async () => { await mgr.unlock(); setUnlocked(mgr.unlocked); }, preloadAll: () => mgr.preloadAll(), preloadSounds: (k) => mgr.preloadSounds(k), preloadScene: (s) => mgr.preloadByScene(s), play: (k, o) => mgr.play(k, o), stopSound: (k) => mgr.stopSound(k), stopByInstance: (i) => mgr.stopByInstance(i), stopAll: () => mgr.stopAll(), pauseAll: () => mgr.pauseAll(), resumeAll: () => mgr.resumeAll(), setMuted: (m) => { mgr.setMuted(m); sync(); }, toggleMuted: () => { mgr.toggleMuted(); sync(); }, setMasterVolume: (v) => { mgr.setMasterVolume(v); sync(); }, setCategoryVolume: (c, v) => { mgr.setCategoryVolume(c, v); sync(); } }), [mgr, muted, ready, sync, unlocked, volume]);
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudioContextValue(): AudioContextValue { const ctx = useContext(AudioCtx); if (!ctx) throw new Error('useAudioContextValue must be used inside AudioProvider'); return ctx; }
