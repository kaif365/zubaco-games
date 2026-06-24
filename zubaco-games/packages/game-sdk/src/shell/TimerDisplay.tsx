// ─── Timer Display Component ────────────────────────────────────
// Pre-built timer UI that games can drop in.

import React from 'react';
import type { GameTimerState } from '../timer/useGameTimer';

export interface TimerDisplayProps {
  timer: GameTimerState;
  /** Position on screen (default: 'top-right') */
  position?: 'top-left' | 'top-right' | 'top-center';
  /** Custom className (for Tailwind users) */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

export function TimerDisplay({ timer, position = 'top-right', className, style }: TimerDisplayProps) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: '1rem', left: '1rem' },
    'top-right': { top: '1rem', right: '1rem' },
    'top-center': { top: '1rem', left: '50%', transform: 'translateX(-50%)' },
  };

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontFamily: 'monospace',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    background: timer.isWarning ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.7)',
    color: timer.isWarning ? '#fff' : '#f3f4f6',
    backdropFilter: 'blur(4px)',
    transition: 'background 0.3s',
    ...positionStyles[position],
    ...style,
  };

  return (
    <div className={className} style={baseStyle}>
      {timer.display}
    </div>
  );
}
