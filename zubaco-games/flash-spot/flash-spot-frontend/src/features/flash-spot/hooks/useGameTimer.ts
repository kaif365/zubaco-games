import { useCallback, useEffect, useRef, useState } from 'react';

interface UseGameTimerOptions {
  durationMs: number;
  onExpire: () => void;
}

export function useGameTimer({ durationMs, onExpire }: UseGameTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(durationMs);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const isPausedRef = useRef(false);
  const pausedAtRef = useRef(0);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        stop();
        onExpireRef.current();
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, durationMs, stop]);

  // Pause timer on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isRunning) {
        isPausedRef.current = true;
        pausedAtRef.current = Date.now();
      } else if (!document.hidden && isPausedRef.current) {
        isPausedRef.current = false;
        const pauseDuration = Date.now() - pausedAtRef.current;
        startTimeRef.current += pauseDuration;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isRunning]);

  const reset = useCallback(() => {
    stop();
    setTimeRemaining(durationMs);
  }, [durationMs, stop]);

  return { timeRemaining, isRunning, start, stop, reset };
}
