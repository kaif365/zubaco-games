import { Howl, Howler } from 'howler';
import { useCallback, useEffect, useRef } from 'react';
import { MEMORY_CARD_AUDIO, MEMORY_CARD_SFX_VOLUME } from '@/config/game-audio';

function createSfx(src: string, volume: number): Howl {
  return new Howl({
    src: [src],
    volume,
    html5: true,
    preload: true,
  });
}

/**
 * Short game SFX; call `play*` from effects or handlers. Unloads on unmount.
 */
export function useMemoryCardSfx(volume: number = MEMORY_CARD_SFX_VOLUME) {
  const flipRef = useRef<Howl | null>(null);
  const matchRef = useRef<Howl | null>(null);
  const mismatchRef = useRef<Howl | null>(null);
  const levelCompleteRef = useRef<Howl | null>(null);

  useEffect(() => {
    flipRef.current = createSfx(MEMORY_CARD_AUDIO.flip, volume);
    matchRef.current = createSfx(MEMORY_CARD_AUDIO.match, Math.min(1, volume * 1.1));
    mismatchRef.current = createSfx(MEMORY_CARD_AUDIO.mismatch, volume);
    levelCompleteRef.current = createSfx(MEMORY_CARD_AUDIO.levelComplete, Math.min(1, volume * 1.15));

    return () => {
      flipRef.current?.unload();
      matchRef.current?.unload();
      mismatchRef.current?.unload();
      levelCompleteRef.current?.unload();
      flipRef.current = null;
      matchRef.current = null;
      mismatchRef.current = null;
      levelCompleteRef.current = null;
    };
  }, [volume]);

  const resumeCtx = useCallback(() => {
    if (Howler.ctx?.state === 'suspended') {
      void Howler.ctx.resume();
    }
  }, []);

  const playFlip = useCallback(() => {
    resumeCtx();
    const h = flipRef.current;
    if (!h) return;
    h.stop();
    h.play();
  }, [resumeCtx]);

  const playMatch = useCallback(() => {
    resumeCtx();
    matchRef.current?.play();
  }, [resumeCtx]);

  const playMismatch = useCallback(() => {
    resumeCtx();
    mismatchRef.current?.play();
  }, [resumeCtx]);

  const playLevelComplete = useCallback(() => {
    resumeCtx();
    levelCompleteRef.current?.play();
  }, [resumeCtx]);

  return { playFlip, playMatch, playMismatch, playLevelComplete };
}
