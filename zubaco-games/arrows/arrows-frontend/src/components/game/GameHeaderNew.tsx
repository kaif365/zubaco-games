import { useAudio } from '@/hooks/useAudio';
import { useState } from 'react';
import { MAX_LIVES } from '@/hooks/useArrowGame';

interface GameHeaderProps {
  timeRemainingMs: number;
  moveCount: number;
  lives: number;
  comboStreak: number;
  undoCount: number;
  solved: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onHint?: () => void;
  level: number;
}

export function GameHeader({
  timeRemainingMs, moveCount, lives, comboStreak,
  undoCount, solved, onUndo, onRestart, level
}: GameHeaderProps) {
  const { isEnabled, setEnabled } = useAudio();
  const [muted, setMuted] = useState(!isEnabled());
  const seconds = Math.ceil(timeRemainingMs / 1000);
  const isLow = seconds <= 10;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeDisplay = minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${seconds}s`;

  return (
    <div className="flex flex-col gap-3 mb-5">
      {/* Main HUD bar */}
      <div className="flex items-center justify-between px-5 py-3 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))",
          border: "1px solid rgba(0, 229, 255, 0.1)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Level badge */}
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(0, 229, 255, 0.05))",
              color: "#00e5ff",
              border: "1px solid rgba(0, 229, 255, 0.2)",
            }}
          >
            LV {level}
          </div>
          <div className="text-sm text-slate-400">
            <span className="text-slate-500">Moves </span>
            <span className="font-bold text-white">{moveCount}</span>
          </div>
        </div>

        {/* Center: Combo or Solved */}
        <div className="flex items-center">
          {solved && (
            <div className="text-sm font-bold tracking-wider"
              style={{ color: "#34d399", textShadow: "0 0 8px rgba(52, 211, 153, 0.5)" }}
            >
              SOLVED
            </div>
          )}
          {comboStreak >= 3 && !solved && (
            <div className="px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05))",
                color: "#fbbf24",
                border: "1px solid rgba(251, 191, 36, 0.2)",
                textShadow: "0 0 6px rgba(251, 191, 36, 0.4)",
              }}
            >
              {comboStreak}x
            </div>
          )}
        </div>

        {/* Timer */}
        <div
          className={`text-lg font-bold tabular-nums tracking-tight ${isLow ? 'animate-pulse' : ''}`}
          style={{
            color: isLow ? "#f43f5e" : "#e2e8f0",
            textShadow: isLow ? "0 0 8px rgba(244, 63, 94, 0.5)" : "none",
          }}
        >
          {timeDisplay}
        </div>
      </div>

      {/* Lives + Actions row */}
      <div className="flex items-center justify-between px-2">
        {/* Lives as dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i < lives ? "#f43f5e" : "rgba(71, 85, 105, 0.4)",
                boxShadow: i < lives ? "0 0 6px rgba(244, 63, 94, 0.5)" : "none",
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <HudButton onClick={onUndo} disabled={undoCount === 0} title="Undo">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </HudButton>

          <HudButton onClick={onRestart} title="Restart">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </HudButton>

          <HudButton
            onClick={() => { const next = !muted; setMuted(next); setEnabled(!next); }}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </HudButton>
        </div>
      </div>
    </div>
  );
}

function HudButton({ onClick, disabled, title, children }: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 rounded-xl text-slate-400 transition-all
        hover:text-white hover:bg-white/5 active:scale-90
        disabled:opacity-25 disabled:cursor-not-allowed"
      style={{ border: "1px solid rgba(71, 85, 105, 0.2)" }}
    >
      {children}
    </button>
  );
}
