import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface GameTimerProps {
  totalSeconds: number;
  running: boolean;
  onExpire?: () => void;
}

/**
 * Countdown timer that ticks once per second; turns red at ≤30 s and calls `onExpire` when it reaches zero.
 *
 * @param props
 * @param props.totalSeconds Total number of seconds to count down from
 * @param props.running Whether the timer is actively ticking
 * @param [props.onExpire] Optional callback fired when the countdown reaches zero
 * @returns The rendered timer span element
 */
export function GameTimer({ totalSeconds, running, onExpire }: GameTimerProps) {
  const [prevTotalSeconds, setPrevTotalSeconds] = useState(totalSeconds);
  const [remaining, setRemaining] = useState(totalSeconds);
  if (totalSeconds !== prevTotalSeconds) {
    setPrevTotalSeconds(totalSeconds);
    setRemaining(totalSeconds);
  }

  const onExpireRef = useRef(onExpire);
  useLayoutEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running || remaining <= 0) return;

    const id = window.setTimeout(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(id);
  }, [running, remaining]);

  useEffect(() => {
    if (remaining === 0 && running) {
      onExpireRef.current?.();
    }
  }, [remaining, running]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining > 0 && remaining <= 30;

  return (
    <span
      className={`font-sans text-sm md:text-lg font-semibold transition-colors ${
        isLow ? 'text-rose-300' : 'text-white'
      }`}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
