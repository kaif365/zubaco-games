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
  onHint: () => void;
  level: number;
}

export function GameHeader({
  timeRemainingMs, moveCount, lives, comboStreak,
  undoCount, solved, onUndo, onRestart, onHint, level
}: GameHeaderProps) {
  const { isEnabled, setEnabled } = useAudio();
  const [muted, setMuted] = useState(!isEnabled());
  const seconds = Math.ceil(timeRemainingMs / 1000);
  const isLow = seconds <= 10;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeDisplay = minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${seconds}s`;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 rounded-xl backdrop-blur-sm">
        {/* Level + Moves */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md">
            Lv.{level}
          </div>
          <div className="text-sm text-gray-300">
            Moves: <span className="font-bold text-white">{moveCount}</span>
          </div>
        </div>

        {/* Solved badge */}
        {solved && (
          <div className="text-sm font-bold text-emerald-400">SOLVED!</div>
        )}

        {/* Combo */}
        {comboStreak >= 3 && !solved && (
          <div className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
            {comboStreak}x Combo!
          </div>
        )}

        {/* Timer */}
        <div className={`text-lg font-bold tabular-nums ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {timeDisplay}
        </div>
      </div>

      {/* Lives */}
      <div className="flex items-center justify-center gap-1 px-4">
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <span key={i} className={`text-lg transition-all ${i < lives ? 'opacity-100' : 'opacity-20 grayscale'}`}>
            ❤️
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onUndo}
          disabled={undoCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/80 text-sm text-gray-300 
            hover:bg-gray-600/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Undo last move"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Undo
        </button>

        <button
          onClick={onHint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/80 text-sm text-gray-300 
            hover:bg-gray-600/80 transition-all"
          title="Show hint"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Hint
        </button>

        <button
          onClick={onRestart}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/80 text-sm text-gray-300 
            hover:bg-gray-600/80 transition-all"
          title="Restart level"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Restart
        </button>

        <button
          onClick={() => { const next = !muted; setMuted(next); setEnabled(!next); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/80 text-sm text-gray-300 
            hover:bg-gray-600/80 transition-all"
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
        </button>
      </div>
    </div>
  );
}
