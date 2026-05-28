import { useEffect, useRef, useState } from 'react';

interface UseAnimatedNumberOptions {
  durationMs?: number;
}

interface UseAnimatedNumberResult {
  animatedValue: number;
  isAnimating: boolean;
}

/**
 * Ease out cubic.
 *
 * @param {number} progress - The progress.
 *
 * @returns {number} The result of easeOutCubic.
 */
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

/**
 * Hook for animated number.
 *
 * @param {number} value - The value.
 * @param {UseAnimatedNumberOptions} options - Function options.
 * @param {number | undefined} [options.durationMs] - The duration ms.
 *
 * @returns {UseAnimatedNumberResult} The result of useAnimatedNumber.
 */
export function useAnimatedNumber(
  value: number,
  { durationMs = 650 }: UseAnimatedNumberOptions = {},
): UseAnimatedNumberResult {
  const [animatedValue, setAnimatedValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number | null>(null);
  const animatedValueRef = useRef(value);

  useEffect(() => {
    animatedValueRef.current = animatedValue;
  }, [animatedValue]);

  useEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const startValue = animatedValueRef.current;
    const delta = value - startValue;

    if (delta === 0 || durationMs <= 0) {
      setAnimatedValue(value);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const startTime = performance.now();

    /**
     * Tick.
     *
     * @param {number} now - The now.
     *
     * @returns {void} No return value.
     */
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(progress);
      const nextValue = startValue + delta * easedProgress;

      if (progress >= 1) {
        animatedValueRef.current = value;
        setAnimatedValue(value);
        setIsAnimating(false);
        frameRef.current = null;
        return;
      }

      const roundedValue = delta > 0 ? Math.floor(nextValue) : Math.ceil(nextValue);
      animatedValueRef.current = roundedValue;
      setAnimatedValue(roundedValue);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, durationMs]);

  return { animatedValue, isAnimating };
}
