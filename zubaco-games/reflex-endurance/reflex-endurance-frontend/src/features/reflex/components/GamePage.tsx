import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReflexGame } from '../hooks/useReflexGame';
import { useGameSession } from '../hooks/useGameSession';
import { InstructionScreen } from '../../../components/InstructionScreen';
import { ResultScreen } from '../../../components/ResultScreen';
import { MenuScreen, type AppPhase } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen } from './StatsScreen';
import { Achievements } from './Achievements';
import { DailyChallenge, markDailyComplete } from './DailyChallenge';
import { PauseDialog } from './PauseDialog';
import { Confetti } from './Confetti';
import type { GameConfig } from '../../../types/game';

const DEFAULT_CONFIG: GameConfig = { timeLimitMs: 300000, initialSpawnIntervalMs: 1200, speedIncreaseEveryMs: 30000, speedMultiplier: 0.85, maxWrongTaps: 2 };

const COLOR_MAP = { green: 'bg-green-500', red: 'bg-red-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500' };

export function GamePage() {
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);
  const { circles, taps, status, score, wrongTaps, timeLeft, startGame: startEngine, tapCircle } = useReflexGame();
  const { startGame: startSession, submitGame } = useGameSession();

  const handleStart = async () => {
    const res = await startSession('reflex-endurance-stage-1');
    const config = res.config || DEFAULT_CONFIG;
    startEngine(res.seed, config);
  };

  const handleEnd = async () => {
    await submitGame(taps, score);
  };

  useEffect(() => { if (status === 'ended') { handleEnd(); if (isDaily) markDailyComplete(); } }, [status]);

  // --- App Phase Screens ---
  if (appPhase === 'menu') return <MenuScreen onNavigate={setAppPhase} />;
  if (appPhase === 'levels') return <LevelSelector onBack={() => setAppPhase('menu')} onSelectLevel={() => setAppPhase('game')} />;
  if (appPhase === 'daily') return <DailyChallenge onBack={() => setAppPhase('menu')} onStartDaily={() => { setIsDaily(true); setAppPhase('game'); }} />;
  if (appPhase === 'achievements') return <Achievements onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'stats') return <StatsScreen onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'settings') return <Settings onBack={() => setAppPhase('menu')} />;

  const secs = Math.ceil(timeLeft / 1000);

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold text-center text-white mb-4">Reflex Endurance</h1>

      {status === 'idle' && (
        <InstructionScreen onStart={handleStart} loading={false} />
      )}

      {status !== 'idle' && (
        <>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-xl mb-4">
            <span className="font-bold text-green-400">Score: {score}</span>
            <span className="text-red-400">Mistakes: {wrongTaps}/2</span>
            <span className={`font-mono font-bold ${secs < 30 ? 'text-red-400' : 'text-green-400'}`}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
          </div>

          <div className="relative w-full aspect-square bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <AnimatePresence>
              {circles.map((c) => (
                <motion.button
                  key={c.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  onClick={() => tapCircle(c)}
                  disabled={status === 'ended'}
                  className={`absolute w-12 h-12 rounded-full ${COLOR_MAP[c.color]} shadow-lg cursor-pointer active:scale-90 transition-transform`}
                  style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}
            </AnimatePresence>

            {status === 'ended' && (
              <>
                <Confetti active={score >= 20} />
                <ResultScreen score={score} success={true} onReplay={() => { setIsDaily(false); setAppPhase('menu'); }} isDaily={isDaily} />
              </>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">Tap only GREEN circles!</p>
        </>
      )}
    </div>
  );
}
