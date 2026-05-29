import { motion, AnimatePresence } from 'framer-motion';

interface GameHeaderProps {
  score: number;
  timeRemaining: number;
  totalTime: number;
  level?: number;
  combo?: number;
  muted?: boolean;
  onMuteToggle?: () => void;
  onPause?: () => void;
}

export function GameHeader({ score, timeRemaining, totalTime, level, combo, muted, onMuteToggle, onPause }: GameHeaderProps) {
  const seconds = Math.ceil(timeRemaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = timeRemaining / totalTime;

  const isLowTime = timeRemaining < 10000;

  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      {/* Top row: level, timer, buttons */}
      <div className="flex items-center justify-between">
        {/* Level badge */}
        <div className="flex items-center gap-2">
          {level && (
            <span className="rounded-lg bg-game-accent/20 px-2.5 py-1 text-xs font-bold text-game-accent">
              Lv.{level}
            </span>
          )}
          <motion.span
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="font-game text-xl font-bold text-white"
          >
            {score}
          </motion.span>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-game-surface">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${isLowTime ? 'bg-red-500' : 'bg-game-accent'}`}
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className={`mt-0.5 text-sm font-semibold ${isLowTime ? 'text-red-400 animate-pulse' : 'text-game-text'}`}>
            {minutes}:{secs.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onMuteToggle && (
            <button onClick={onMuteToggle} className="rounded-lg bg-white/5 p-2 text-sm">
              {muted ? '🔇' : '🔊'}
            </button>
          )}
          {onPause && (
            <button onClick={onPause} className="rounded-lg bg-white/5 p-2 text-sm">
              ⏸️
            </button>
          )}
        </div>
      </div>

      {/* Combo badge */}
      <AnimatePresence>
        {combo !== undefined && combo >= 3 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="self-center rounded-full bg-orange-500/20 px-4 py-1 text-xs font-bold text-orange-400"
          >
            🔥 {combo}× Combo!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
