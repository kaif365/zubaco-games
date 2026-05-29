import { useEffect, useRef, useState } from 'react';

import type { TileId } from '@/types/game';

interface UseSequencePlaybackOptions {
  sequence: TileId[];
  playbackMs: number;
  gapMs: number;
  enabled: boolean;
  onComplete: () => void;
  // Increment to force a restart even when sequence reference hasn't changed
  // (e.g. replaying the same sequence after a wrong input)
  playbackKey?: number;
}

/**
 * Hook for sequence playback.
 *
 * @param {UseSequencePlaybackOptions} options - Function options.
 * @param {number[]} options.sequence - The sequence.
 * @param {number} options.playbackMs - The playback ms.
 * @param {number} options.gapMs - The gap ms.
 * @param {boolean} options.enabled - The enabled.
 * @param {() => void} options.onComplete - The on complete.
 * @param {number | undefined} [options.playbackKey] - The playback key.
 *
 * @returns {number | null} The result of useSequencePlayback.
 */
export function useSequencePlayback({
  sequence,
  playbackMs,
  gapMs,
  enabled,
  onComplete,
  playbackKey = 0,
}: UseSequencePlaybackOptions) {
  const [activeTile, setActiveTile] = useState<TileId | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled || sequence.length === 0) {
      setActiveTile(null);
      return;
    }

    let cancelled = false;
    /**
     * Run.
     *
     * @returns {Promise<void>} A promise that resolves when the operation completes.
     */
    const run = async () => {
      for (const tile of sequence) {
        if (cancelled) return;
        setActiveTile(tile);
        await new Promise((resolve) => setTimeout(resolve, playbackMs));
        setActiveTile(null);
        await new Promise((resolve) => setTimeout(resolve, gapMs));
      }
      if (cancelled) return;
      onCompleteRef.current();
    };

    void run();

    return () => {
      cancelled = true;
      setActiveTile(null);
    };
  }, [enabled, gapMs, playbackMs, playbackKey, sequence]);

  return activeTile;
}
