import { useState, useCallback, useRef, useEffect } from 'react';
import type { Circle, Tap, GameConfig } from '../../../types/game';
import { generateCircle, mulberry32 } from '../engine/circleGenerator';

export function useReflexGame() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [taps, setTaps] = useState<Tap[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState(0);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const rngRef = useRef<() => number>(() => 0);
  const configRef = useRef<GameConfig | null>(null);
  const circleIdRef = useRef(0);
  const spawnRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const pausedAtRef = useRef(0);

  const spawnCircle = useCallback(() => {
    if (status !== 'playing') return;
    const config = configRef.current!;
    const elapsed = Date.now() - startTimeRef.current;
    const speedups = Math.floor(elapsed / config.speedIncreaseEveryMs);
    const interval = Math.max(300, config.initialSpawnIntervalMs * Math.pow(config.speedMultiplier, speedups));

    const circle = generateCircle(rngRef.current, circleIdRef.current++, Date.now());
    setCircles((prev) => [...prev, circle]);

    // Auto-remove after 2 seconds
    const id = circle.id;
    setTimeout(() => { setCircles((prev) => prev.filter((c) => c.id !== id)); }, 2000);

    spawnRef.current = setTimeout(spawnCircle, interval);
  }, [status]);

  const startGame = useCallback((seed: number, config: GameConfig) => {
    rngRef.current = mulberry32(seed);
    configRef.current = config;
    circleIdRef.current = 0;
    setCircles([]);
    setTaps([]);
    setScore(0);
    setWrongTaps(0);
    setStatus('playing');
    setTimeLeft(config.timeLimitMs);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const remaining = Math.max(0, config.timeLimitMs - (Date.now() - startTimeRef.current));
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(timerRef.current); clearTimeout(spawnRef.current); setStatus('ended'); }
    }, 100);

    // Start spawning
    const firstCircle = generateCircle(rngRef.current, circleIdRef.current++, Date.now());
    setCircles([firstCircle]);
    setTimeout(() => { setCircles((prev) => prev.filter((c) => c.id !== firstCircle.id)); }, 2000);
    spawnRef.current = setTimeout(spawnCircle, config.initialSpawnIntervalMs);
  }, [spawnCircle]);

  const tapCircle = useCallback((circle: Circle) => {
    if (status !== 'playing') return;
    const correct = circle.color === 'green';
    const tap: Tap = { circleId: circle.id, timestamp: Date.now(), correct };
    setTaps((prev) => [...prev, tap]);
    setCircles((prev) => prev.filter((c) => c.id !== circle.id));

    if (correct) {
      setScore((s) => s + 1);
    } else {
      setWrongTaps((w) => {
        const next = w + 1;
        if (next >= (configRef.current?.maxWrongTaps ?? 2)) {
          clearInterval(timerRef.current); clearTimeout(spawnRef.current); setStatus('ended');
        }
        return next;
      });
    }
  }, [status]);

  useEffect(() => { return () => { clearInterval(timerRef.current); clearTimeout(spawnRef.current); }; }, []);

  // Pause timer on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && status === 'playing') {
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
  }, [status]);

  return { circles, taps, status, score, wrongTaps, timeLeft, startGame, tapCircle };
}
