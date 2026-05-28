import { useCallback, useRef } from 'react';

type SoundType = 'correct' | 'incorrect' | 'tap' | 'complete' | 'countdown' | 'start';

const SOUND_ENABLED_KEY = 'zubaco_sound_enabled';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  return AC ? new AC() : null;
}

function playTone(ctx: AudioContext, frequency: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playCorrect(ctx: AudioContext) {
  playTone(ctx, 523.25, 0.1, 'sine', 0.25); // C5
  setTimeout(() => playTone(ctx, 659.25, 0.15, 'sine', 0.25), 80); // E5
}

function playIncorrect(ctx: AudioContext) {
  playTone(ctx, 200, 0.2, 'sawtooth', 0.15);
  setTimeout(() => playTone(ctx, 150, 0.25, 'sawtooth', 0.12), 100);
}

function playTap(ctx: AudioContext) {
  playTone(ctx, 800, 0.05, 'sine', 0.15);
}

function playComplete(ctx: AudioContext) {
  playTone(ctx, 523.25, 0.12, 'sine', 0.2);
  setTimeout(() => playTone(ctx, 659.25, 0.12, 'sine', 0.2), 100);
  setTimeout(() => playTone(ctx, 783.99, 0.12, 'sine', 0.2), 200);
  setTimeout(() => playTone(ctx, 1046.5, 0.3, 'sine', 0.25), 300);
}

function playCountdown(ctx: AudioContext) {
  playTone(ctx, 440, 0.08, 'square', 0.1);
}

function playStart(ctx: AudioContext) {
  playTone(ctx, 440, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(ctx, 880, 0.15, 'sine', 0.2), 120);
}

const SOUND_MAP: Record<SoundType, (ctx: AudioContext) => void> = {
  correct: playCorrect,
  incorrect: playIncorrect,
  tap: playTap,
  complete: playComplete,
  countdown: playCountdown,
  start: playStart,
};

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const isEnabled = useCallback(() => {
    return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  const play = useCallback((sound: SoundType) => {
    if (!isEnabled()) return;
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = getAudioContext();
      }
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      SOUND_MAP[sound](ctx);
    } catch {
      // Audio not available — silent fail
    }
  }, [isEnabled]);

  return { play, isEnabled, setEnabled };
}
