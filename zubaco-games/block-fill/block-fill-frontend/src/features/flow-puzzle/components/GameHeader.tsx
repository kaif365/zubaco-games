import { motion } from 'framer-motion';
import { useAudio } from '@/audio';
import { GameTimer } from '@/features/flow-puzzle/components/GameTimer';

interface GameHeaderProps {
  levelLabel: string | number;
  isDemoRound: boolean;
  sessionTimerSeconds: number;
  stageKey: number;
  onRestart?: () => void;
  onTimerExpire?: () => void;
  hideLevel?: boolean;
}

export function GameHeader({
  levelLabel,
  isDemoRound,
  sessionTimerSeconds,
  stageKey,
  onRestart,
  onTimerExpire,
  hideLevel = false,
}: GameHeaderProps) {
  const audio = useAudio();

  const handleMuteToggle = () => {
    audio.toggleMuted();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/80 rounded-xl backdrop-blur-sm border border-gray-700/50">
        {/* Level */}
        <div className="flex items-center gap-2">
          {!hideLevel && (
            <div className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-md">
              Lv.{levelLabel}
            </div>
          )}
          {isDemoRound && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
              Demo
            </span>
          )}
        </div>

        {/* Timer */}
        {sessionTimerSeconds > 0 && (
          <GameTimer
            key={stageKey}
            totalSeconds={sessionTimerSeconds}
            running={true}
            onExpire={onTimerExpire}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        {onRestart && (
          <motion.button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/80 text-sm text-gray-300
              hover:bg-gray-600/80 transition-all"
            title="Restart"
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restart
          </motion.button>
        )}

        <motion.button
          onClick={handleMuteToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/80 text-sm text-gray-300
            hover:bg-gray-600/80 transition-all"
          title={audio.muted ? 'Unmute' : 'Mute'}
          whileTap={{ scale: 0.95 }}
        >
          {audio.muted ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
          {audio.muted ? 'Unmute' : 'Mute'}
        </motion.button>
      </div>
    </div>
  );
}
