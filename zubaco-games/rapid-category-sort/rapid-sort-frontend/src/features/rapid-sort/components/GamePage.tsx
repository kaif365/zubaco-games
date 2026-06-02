import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { StageConfig } from '@/types/game';
import { useGameSession } from '../hooks/useGameSession';
import { useRapidSort } from '../hooks/useRapidSort';
import { FallingItem } from './FallingItem';
import { CategoryLanes } from './CategoryLanes';
import { GameHeader } from './GameHeader';
import { InstructionScreen } from '@/components/InstructionScreen';
import { ResultScreen } from '@/components/ResultScreen';
import { MenuScreen, type AppPhase } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen } from './StatsScreen';
import { Achievements } from './Achievements';
import { DailyChallenge, markDailyComplete } from './DailyChallenge';
import { PauseDialog } from './PauseDialog';
import { Confetti } from './Confetti';

const DEFAULT_STAGE_ID = '00000000-0000-0000-0000-000000000001';

export function GamePage() {
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);
  const { startGame: startSession, submitResult, sessionId, loading, error } = useGameSession();
  const [config, setConfig] = useState<StageConfig | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [serverScore, setServerScore] = useState<number | undefined>(undefined);
  const [gameStarted, setGameStarted] = useState(false);

  const {
    phase,
    currentItemIndex,
    currentItem,
    currentCategory,
    answers,
    score,
    timeRemainingMs,
    streak,
    lastFeedback,
    startGame,
    swipe,
    finishGame,
  } = useRapidSort(config, seed);

  const handleStart = useCallback(async () => {
    const session = await startSession(DEFAULT_STAGE_ID);
    if (session) {
      setConfig(session.config);
      setSeed(session.seed);
      setGameStarted(true);
    }
  }, [startSession]);

  // Start game when config+seed ready
  useEffect(() => {
    if (gameStarted && config && seed !== null) {
      startGame();
      setGameStarted(false);
    }
  }, [gameStarted, config, seed, startGame]);

  // Auto-submit when finished
  useEffect(() => {
    if (phase === 'finished' && score && sessionId) {
      submitResult(sessionId, answers, score.finalScore).then((resp) => {
        if (resp) setServerScore(resp.finalScore);
      });
      if (isDaily) markDailyComplete();
    }
  }, [phase]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') swipe('left');
      if (e.key === 'ArrowRight' || e.key === 'd') swipe('right');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, swipe]);

  // --- App Phase Screens ---
  if (appPhase === 'menu') return <MenuScreen onNavigate={setAppPhase} />;
  if (appPhase === 'levels') return <LevelSelector onBack={() => setAppPhase('menu')} onSelectLevel={() => setAppPhase('game')} />;
  if (appPhase === 'daily') return <DailyChallenge onBack={() => setAppPhase('menu')} onStartDaily={() => { setIsDaily(true); setAppPhase('game'); }} />;
  if (appPhase === 'achievements') return <Achievements onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'stats') return <StatsScreen onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'settings') return <Settings onBack={() => setAppPhase('menu')} />;

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 relative overflow-hidden select-none">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-50 text-red-400 text-sm text-center p-2 bg-red-500/10 rounded-lg">
          {error}
        </div>
      )}

      {/* Idle state */}
      {phase === 'idle' && (
        <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
          <InstructionScreen onStart={handleStart} loading={loading} />
        </div>
      )}

      {/* Playing state */}
      {phase === 'playing' && config && (
        <>
          <GameHeader
            timeRemainingMs={timeRemainingMs}
            correctCount={answers.filter((a) => a.correct).length}
            wrongCount={answers.filter((a) => !a.correct).length}
            streak={streak}
            currentIndex={currentItemIndex}
            totalItems={config.totalItems}
          />
          <CategoryLanes category={currentCategory} onSwipe={swipe} feedback={lastFeedback} />
          <FallingItem item={currentItem} feedback={lastFeedback} />

          {/* Feedback flash */}
          {lastFeedback === 'correct' && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400 text-4xl font-black pointer-events-none"
              initial={{ opacity: 1, scale: 1.5 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.4 }}
              key={`fb-${currentItemIndex}`}
            >
              ✓
            </motion.div>
          )}
          {lastFeedback === 'wrong' && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-400 text-4xl font-black pointer-events-none"
              initial={{ opacity: 1, scale: 1.5 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.4 }}
              key={`fb-${currentItemIndex}`}
            >
              ✗
            </motion.div>
          )}
        </>
      )}

      {/* Finished state */}
      {phase === 'finished' && score && (
        <div className="h-full flex items-center justify-center">
          <Confetti active={score.correctCount > 8} />
              <ResultScreen score={serverScore ?? score.finalScore} success={true} onReplay={() => { setIsDaily(false); setAppPhase('menu'); }} isDaily={isDaily} />
        </div>
      )}
    </div>
  );
}
