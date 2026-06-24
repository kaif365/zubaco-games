import { motion } from 'framer-motion';
import { useState } from 'react';
import { TutorialCarousel, isTutorialDone } from '@/features/flow-puzzle/components/TutorialCarousel';
import { StatsScreen } from '@/features/flow-puzzle/components/StatsScreen';
import { DailyChallenge, isDailyCompleted } from '@/features/flow-puzzle/components/DailyChallenge';
import { Achievements } from '@/features/flow-puzzle/components/Achievements';
import { Settings } from '@/features/flow-puzzle/components/Settings';
import { LevelSelector } from '@/features/flow-puzzle/components/LevelSelector';
import type { StageId } from '@micro-screens/src';
import type { StageInstructionContentMap } from '@micro-screens/src/types/instruction-content';

type SubScreen = 'menu' | 'tutorial' | 'stats' | 'daily' | 'achievements' | 'settings' | 'levels';

interface InstructionsLobbyScreenProps {
  stage?: StageId;
  isStarting: boolean;
  enableLearnHowToPlay: boolean;
  onPlayNow: (level: number) => void;
  onPlayDaily: (level: number) => void;
  onLearnHowToPlay?: () => void;
  contentByStage?: Partial<StageInstructionContentMap>;
  isContentLoading?: boolean;
}

export function InstructionsLobbyScreen({
  stage: _stage,
  isStarting,
  enableLearnHowToPlay,
  onPlayNow,
  onPlayDaily,
  onLearnHowToPlay,
  contentByStage: _contentByStage,
  isContentLoading: _isContentLoading = false,
}: InstructionsLobbyScreenProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(!isTutorialDone() ? 'tutorial' : 'menu');

  if (subScreen === 'tutorial') {
    return <TutorialCarousel onComplete={() => setSubScreen('menu')} />;
  }

  if (subScreen === 'stats') {
    return <StatsScreen onBack={() => setSubScreen('menu')} />;
  }

  if (subScreen === 'daily') {
    return (
      <DailyChallenge
        onPlay={(level: number) => { onPlayDaily(level); }}
        onBack={() => setSubScreen('menu')}
      />
    );
  }

  if (subScreen === 'achievements') {
    return <Achievements onClose={() => setSubScreen('menu')} />;
  }

  if (subScreen === 'settings') {
    return <Settings onClose={() => setSubScreen('menu')} />;
  }

  if (subScreen === 'levels') {
    return (
      <LevelSelector
        onSelect={(level: number) => { onPlayNow(level); }}
        onBack={() => setSubScreen('menu')}
      />
    );
  }

  const dailyDone = isDailyCompleted();

  return (
    <motion.div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated icon */}
      <motion.div
        className="text-5xl mb-2"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        🧩
      </motion.div>

      <h1 className="text-3xl font-black text-white tracking-tight">Block Fill</h1>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Connect dots and fill the board before time runs out!
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        {/* Primary Play button → Level Select */}
        <motion.button
          onClick={isStarting ? undefined : () => setSubScreen('levels')}
          disabled={isStarting}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          whileHover={!isStarting ? { scale: 1.02 } : undefined}
          whileTap={!isStarting ? { scale: 0.98 } : undefined}
        >
          {isStarting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Starting…
            </span>
          ) : (
            '▶ Play'
          )}
        </motion.button>

        {/* Daily Challenge */}
        <motion.button
          onClick={() => setSubScreen('daily')}
          className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
            dailyDone
              ? 'bg-gray-700/60 text-gray-400'
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          📅 Daily Challenge {dailyDone && '✓'}
        </motion.button>

        {/* Learn how to play (demo) */}
        {enableLearnHowToPlay && onLearnHowToPlay && (
          <motion.button
            onClick={onLearnHowToPlay}
            className="w-full py-3 rounded-xl bg-gray-700/60 text-sm font-medium text-gray-300 hover:bg-gray-600/60 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🎮 Learn How to Play
          </motion.button>
        )}

        {/* Bottom icon grid */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <motion.button
            onClick={() => setSubScreen('achievements')}
            className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.95 }}
          >
            🏆
          </motion.button>
          <motion.button
            onClick={() => setSubScreen('stats')}
            className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.95 }}
          >
            📊
          </motion.button>
          <motion.button
            onClick={() => setSubScreen('settings')}
            className="py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm"
            whileTap={{ scale: 0.95 }}
          >
            ⚙️
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
