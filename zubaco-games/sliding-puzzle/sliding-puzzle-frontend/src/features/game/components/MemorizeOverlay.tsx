import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveImageUrl } from '@/utils/imageUrl';

interface MemorizeOverlayProps {
  fullImageUrl: string;
  gridX: number;
  gridY: number;
  displayTime: number;
  /**
   * When false the overlay is transparent — the real game tiles are visible
   * underneath. Only the countdown bar and label are rendered. The image
   * preload is skipped and the countdown starts immediately.
   * Defaults to true (original full-image overlay behaviour).
   */
  showImage?: boolean;
  onComplete: () => void;
}

const FADE_DURATION_MS = 380;

/**
 * "Memorize!" overlay.
 *
 * showImage=true (default): shows the solved image with a countdown bar.
 * showImage=false: transparent overlay — tiles are visible underneath.
 *   Only the progress bar and label appear. Countdown starts immediately.
 */
export default function MemorizeOverlay({
  fullImageUrl,
  gridX,
  gridY,
  displayTime,
  showImage = true,
  onComplete,
}: Readonly<MemorizeOverlayProps>) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [remaining, setRemaining] = useState(displayTime);
  const [barWidth, setBarWidth] = useState(100);
  const [fadingOut, setFadingOut] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const resolvedUrl = resolveImageUrl(fullImageUrl);

  const stopCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Preload the image — always, even when showImage=false ────────
  // This ensures countdown starts only after the image is visible in GameBoard's overlay.
  useEffect(() => {
    const img = new globalThis.Image();
    const onLoad = () => { setImageLoaded(true); };
    const onError = () => { setImageLoaded(true); };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = resolvedUrl;
    if (img.complete) setImageLoaded(true);
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [resolvedUrl]);

  // ── Countdown + bar shrink (starts only after imageLoaded) ───────
  useEffect(() => {
    if (!imageLoaded) return;
    setRemaining(displayTime);
    requestAnimationFrame(() => { setBarWidth(0); });

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          stopCountdown();
          setFadingOut(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return stopCountdown;
  }, [imageLoaded, displayTime, stopCountdown]);

  // ── After fade completes, hand off to game ───────────────────────
  useEffect(() => {
    if (!fadingOut) return;
    const timer = setTimeout(() => { onCompleteRef.current(); }, FADE_DURATION_MS);
    return () => { clearTimeout(timer); };
  }, [fadingOut]);

  // ── Build cell arrays for the shimmer skeleton ───────────────────
  const blankSlot = gridX * gridY - 1;

  const shimmerCells = showImage
    ? Array.from({ length: gridX * gridY }, (_, slot) => (
        <div
          key={slot}
          className={`puzzle-shimmer-cell${slot === blankSlot ? ' puzzle-shimmer-cell--blank' : ''}`}
        />
      ))
    : null;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-end rounded-[8px] overflow-hidden"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: fadingOut ? `opacity ${String(FADE_DURATION_MS)}ms ease` : undefined,
        pointerEvents: fadingOut ? 'none' : undefined,
      }}
    >
      {showImage && (
        <>
          {/* Shimmer skeleton — fades out once the image is ready */}
          <div
            className="absolute inset-0 grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${String(gridX)}, 1fr)`,
              opacity: imageLoaded ? 0 : 1,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
            }}
          >
            {shimmerCells}
          </div>

          {/* Real image — crossfades in once loaded */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          >
            <img
              src={resolvedUrl}
              alt="Memorize"
              className="h-full w-full object-fill transition-all duration-300"
            />
          </div>
        </>
      )}

      {/* Shrinking progress bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-[#f4ca46]"
        style={{
          width: `${String(barWidth)}%`,
          transition: imageLoaded ? `width ${String(displayTime)}s linear` : undefined,
        }}
      />

      {/* Counter label */}
      <div className="relative z-10 mb-3 rounded-md bg-black/65 px-3 py-1 text-sm font-bold text-white tracking-wider">
        {imageLoaded ? t('game.memorize', { remaining }) : t('game.loadingImage')}
      </div>
    </div>
  );
}
