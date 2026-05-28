import { useEffect, useState } from 'react';

import { resolveImageUrl } from '@/utils/imageUrl';

interface RevealOverlayProps {
  fullImageUrl: string;
  gridX: number;
  gridY: number;
  onComplete: () => void;
}

const REVEAL_DURATION_MS = 1500;
const FADE_DURATION_MS = 400;

export default function RevealOverlay({ fullImageUrl, onComplete }: Readonly<RevealOverlayProps>) {
  const [visible, setVisible] = useState(false);
  const resolvedUrl = resolveImageUrl(fullImageUrl);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = globalThis.setTimeout(onComplete, REVEAL_DURATION_MS);
    return () => globalThis.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="absolute inset-0 z-30 rounded-[8px] overflow-hidden pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_DURATION_MS}ms ease`,
        background: 'rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <img
        src={resolvedUrl}
        alt="Solved puzzle"
        className="w-full h-full object-fill"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1.03)' : 'scale(1)',
          transition: `opacity ${FADE_DURATION_MS}ms ease, transform ${REVEAL_DURATION_MS}ms ease`,
          display: 'block',
        }}
      />
    </div>
  );
}
