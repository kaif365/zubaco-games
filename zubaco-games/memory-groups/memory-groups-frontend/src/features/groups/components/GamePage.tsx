import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordCard } from './WordCard';
import { MenuScreen } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen } from './StatsScreen';
import { Achievements } from './Achievements';
import { DailyChallenge, markDailyComplete } from './DailyChallenge';
import { InstructionScreen } from '../../../components/InstructionScreen';
import { ResultScreen } from '../../../components/ResultScreen';
import { useMemoryGroups } from '../hooks/useMemoryGroups';
import { useGameSession } from '../hooks/useGameSession';
import type { GameConfig } from '../../../types/game';

type AppPhase = 'menu' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

const DEFAULT_CONFIG: GameConfig = { showDurationMs: 5000, timeLimitMs: 60000, groupSize: 3, totalGroups: 3, pointsPerGroup: 50, pointsPerPartialWord: 10, timeBonusMultiplier: 3 };

export function GamePage() {
  const { phase, shuffledWords, selectedWords, submittedGroups, score, timeLeft, startGame: startEngine, toggleWord, submitGroup } = useMemoryGroups();
  const { startGame: startSession, submitGame } = useGameSession();
  const [_config, setConfig] = useState(DEFAULT_CONFIG);
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);

  const handleStart = async () => {
    const res = await startSession('memory-groups-stage-1');
    const config = res.config || DEFAULT_CONFIG;
    setConfig(config);
    startEngine(res.seed, config);
  };

  const handleSubmitFinal = async () => {
    await submitGame(submittedGroups, score);
  };

  useEffect(() => { if (phase === 'ended') { handleSubmitFinal(); if (isDaily) markDailyComplete(); } }, [phase]);

  const usedWords = submittedGroups.flat();
  const secs = Math.ceil(timeLeft / 1000);

  // ─── Menu Screens ──────────────────────────────────────────────────────
  if (appPhase === 'menu') {
    return (
      <MenuScreen
        onPlay={() => setAppPhase('game')}
        onLevels={() => setAppPhase('levels')}
        onDaily={() => setAppPhase('daily')}
        onAchievements={() => setAppPhase('achievements')}
        onStats={() => setAppPhase('stats')}
        onSettings={() => setAppPhase('settings')}
      />
    );
  }

  if (appPhase === 'levels') {
    return <LevelSelector onSelect={() => { setAppPhase('game'); handleStart(); }} onBack={() => setAppPhase('menu')} />;
  }

  if (appPhase === 'daily') {
    return <DailyChallenge onPlay={() => { setIsDaily(true); setAppPhase('game'); handleStart(); }} onBack={() => setAppPhase('menu')} />;
  }

  if (appPhase === 'achievements') {
    return <Achievements onBack={() => setAppPhase('menu')} />;
  }

  if (appPhase === 'stats') {
    return <StatsScreen onBack={() => setAppPhase('menu')} />;
  }

  if (appPhase === 'settings') {
    return <Settings onBack={() => setAppPhase('menu')} />;
  }

  // ─── Game Flow ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center text-white mb-4">Memory Groups</h1>

      {phase === 'idle' && (
        <InstructionScreen onStart={handleStart} loading={false} />
      )}

      {phase === 'memorize' && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-yellow-400 text-xl font-bold animate-pulse">MEMORIZE THESE WORDS!</p>
          <div className="grid grid-cols-3 gap-3">
            {shuffledWords.map((w) => (
              <motion.div key={w} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-purple-700 rounded-lg text-center font-bold text-lg text-white">{w}</motion.div>
            ))}
          </div>
        </div>
      )}

      {(phase === 'play' || phase === 'ended') && (
        <>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-xl mb-4">
            <span className="font-bold text-purple-400">Score: {score}</span>
            <span className="text-gray-300">Groups: {submittedGroups.length}/3</span>
            <span className={`font-mono font-bold ${secs < 10 ? 'text-red-400' : 'text-green-400'}`}>{secs}s</span>
          </div>

          <p className="text-sm text-gray-400 mb-2 text-center">Select 3 words that belong together, then tap "Lock Group"</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <AnimatePresence>
              {shuffledWords.map((w) => (
                <WordCard key={w} word={w} selected={selectedWords.includes(w)} used={usedWords.includes(w)} disabled={phase === 'ended'} onClick={() => toggleWord(w)} />
              ))}
            </AnimatePresence>
          </div>

          {phase === 'play' && (
            <button onClick={submitGroup} disabled={selectedWords.length !== 3} className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-white transition-colors">Lock Group ({selectedWords.length}/3)</button>
          )}

          {phase === 'ended' && (
            <ResultScreen score={score} success={true} onReplay={() => { setIsDaily(false); setAppPhase('menu'); }} isDaily={isDaily} />
          )}
        </>
      )}
    </div>
  );
}
