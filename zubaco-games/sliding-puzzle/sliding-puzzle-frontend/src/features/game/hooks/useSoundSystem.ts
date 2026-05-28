import { useCallback, useEffect, useRef, useState } from 'react';

const BASE_VOLUMES = {
  background: 0.35,
  tap: 0.7,
  whoosh: 0.5,
  wrongStep: 0.8,
  success: 1.0,
} as const;

const LS_MUSIC_KEY = 'game:musicvol';
const LS_SFX_KEY = 'game:sfxvol';

function loadMultiplier(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return 1.0;
    const val = parseFloat(raw);
    return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 1.0;
  } catch {
    return 1.0;
  }
}

export interface SoundSystem {
  startBackground: () => void;
  playWhoosh: () => void;
  playTap: () => void;
  playWrongStep: () => void;
  playSuccess: () => void;
  musicMultiplier: number;
  sfxMultiplier: number;
  setMusicMultiplier: (v: number) => void;
  setSfxMultiplier: (v: number) => void;
}

export function useSoundSystem(): SoundSystem {
  const [musicMultiplier, setMusicMultiplierState] = useState(() => loadMultiplier(LS_MUSIC_KEY));
  const [sfxMultiplier, setSfxMultiplierState] = useState(() => loadMultiplier(LS_SFX_KEY));

  const bgRef = useRef<HTMLAudioElement | null>(null);
  const tapRef = useRef<HTMLAudioElement | null>(null);
  const whooshRef = useRef<HTMLAudioElement | null>(null);
  const wrongRef = useRef<HTMLAudioElement | null>(null);
  const successRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const musicVol = loadMultiplier(LS_MUSIC_KEY);
    const sfxVol = loadMultiplier(LS_SFX_KEY);

    const bg = new Audio('/sounds/background_sound.mp3');
    bg.loop = true;
    bg.volume = BASE_VOLUMES.background * musicVol;
    bgRef.current = bg;

    const tap = new Audio('/sounds/tap_sound.mp3');
    tap.volume = BASE_VOLUMES.tap * sfxVol;
    tapRef.current = tap;

    const whoosh = new Audio('/sounds/whoosh_sound.mp3');
    whoosh.volume = BASE_VOLUMES.whoosh * sfxVol;
    whooshRef.current = whoosh;

    const wrong = new Audio('/sounds/wrong_step.mp3');
    wrong.volume = BASE_VOLUMES.wrongStep * sfxVol;
    wrongRef.current = wrong;

    const success = new Audio('/sounds/success_sound.mp3');
    success.volume = BASE_VOLUMES.success * sfxVol;
    successRef.current = success;

    return () => {
      bg.pause();
    };
  }, []);

  // Sync background volume when music multiplier changes
  useEffect(() => {
    if (bgRef.current) {
      bgRef.current.volume = BASE_VOLUMES.background * musicMultiplier;
    }
  }, [musicMultiplier]);

  // Sync SFX volumes when sfx multiplier changes
  useEffect(() => {
    if (tapRef.current) tapRef.current.volume = BASE_VOLUMES.tap * sfxMultiplier;
    if (whooshRef.current) whooshRef.current.volume = BASE_VOLUMES.whoosh * sfxMultiplier;
    if (wrongRef.current) wrongRef.current.volume = BASE_VOLUMES.wrongStep * sfxMultiplier;
    if (successRef.current) successRef.current.volume = BASE_VOLUMES.success * sfxMultiplier;
  }, [sfxMultiplier]);

  const startBackground = useCallback(() => {
    const bg = bgRef.current;
    if (!bg) return;
    if (!bg.paused) return;
    void bg.play().catch(() => undefined);
  }, []);

  const playWhoosh = useCallback(() => {
    const snd = whooshRef.current;
    if (!snd) return;
    snd.currentTime = 0;
    void snd.play().catch(() => undefined);
  }, []);

  const playTap = useCallback(() => {
    const snd = tapRef.current;
    if (!snd) return;
    snd.currentTime = 0;
    void snd.play().catch(() => undefined);
  }, []);

  const playWrongStep = useCallback(() => {
    const snd = wrongRef.current;
    if (!snd) return;
    snd.currentTime = 0;
    void snd.play().catch(() => undefined);
  }, []);

  const playSuccess = useCallback(() => {
    const snd = successRef.current;
    if (!snd) return;
    snd.currentTime = 0;
    void snd.play().catch(() => undefined);
  }, []);

  const setMusicMultiplier = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setMusicMultiplierState(clamped);
    try {
      localStorage.setItem(LS_MUSIC_KEY, String(clamped));
    } catch {
      // ignore storage errors
    }
  }, []);

  const setSfxMultiplier = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setSfxMultiplierState(clamped);
    try {
      localStorage.setItem(LS_SFX_KEY, String(clamped));
    } catch {
      // ignore storage errors
    }
  }, []);

  return {
    startBackground,
    playWhoosh,
    playTap,
    playWrongStep,
    playSuccess,
    musicMultiplier,
    sfxMultiplier,
    setMusicMultiplier,
    setSfxMultiplier,
  };
}
