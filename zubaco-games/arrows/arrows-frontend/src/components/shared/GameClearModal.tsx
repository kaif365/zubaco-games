import { Timer } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface GameClearModalProps {
  title: string;
  onConfirm: () => void;
  /** resultAccent hex — icon and text color */
  accentColor?: string;
  /** eclipse hex — border and icon background tint */
  eclipseColor?: string;
  /** Where to redirect. Defaults to "the homepage" */
  redirectDestination?: string;
  /** Countdown duration in seconds. Defaults to 5 */
  countdownSecs?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function GameClearModal({
  title,
  onConfirm,
  accentColor = '#25B19A',
  eclipseColor = '#205A52',
  redirectDestination = 'the homepage',
  countdownSecs = 5,
}: Readonly<GameClearModalProps>) {
  const [seconds, setSeconds] = useState(countdownSecs);
  const [isAnimated, setIsAnimated] = useState(false);
  const onConfirmRef = useRef(onConfirm);
  useLayoutEffect(() => { onConfirmRef.current = onConfirm; });

  useEffect(() => {
    const raf = requestAnimationFrame(() => { setIsAnimated(true); });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      onConfirmRef.current();
      return;
    }
    const timer = setTimeout(() => { setSeconds((s) => s - 1); }, 1000);
    return () => { clearTimeout(timer); };
  }, [seconds]);

  return createPortal(
    <div className="fixed left-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] z-[100] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 px-4">
      <div
        className={`flex items-center gap-3.5 rounded-xl px-4 py-3.5 w-full transition-all duration-300 ease-out transform ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
        style={{
          background: 'rgba(15, 18, 23, 0.95)',
          border: `1px solid ${hexToRgba(eclipseColor, 0.5)}`,
        }}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: hexToRgba(accentColor, 0.2) }}
        >
          <Timer className="w-[17px] h-[17px] text-white" />
        </div>

        <div className="flex-1 min-w-0 font-sans">
          <p className="text-sm font-bold leading-snug" style={{ color: accentColor }}>
            {title}
          </p>
          <p
            className="text-[13px] font-normal leading-[1.4] opacity-85 mt-0.5 text-white"
          >
            {`Auto redirecting to ${redirectDestination} in ${String(seconds)} ${seconds === 1 ? 'sec' : 'secs'}`}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
