import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePatternGame } from '../hooks/usePatternGame';
import { useGameSession } from '../hooks/useGameSession';
import { MenuScreen } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { Settings } from './Settings';
import { StatsScreen } from './StatsScreen';
import { Achievements } from './Achievements';
import { DailyChallenge } from './DailyChallenge';
import { InstructionScreen } from '../../../components/InstructionScreen';
import { ResultScreen } from '../../../components/ResultScreen';
import type { GameConfig, CellColor } from '../../../types/game';

type AppPhase = 'menu' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

const DEFAULT_CONFIG: GameConfig = { gridSize: 3, colors: ['red','green','blue','yellow','purple','orange'], timeLimitMs: 300000, flashDurationMs: 500, pointsPerRound: 20, perfectBonus: 10 };

const COLOR_MAP: Record<CellColor, string> = { red: 'bg-red-500', green: 'bg-green-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500', purple: 'bg-purple-500', orange: 'bg-orange-500' };

export function GamePage() {
  const { phase, round, score, perfectRounds, cellColors, highlightIdx, timeLeft, startGame: startEngine, tapCell } = usePatternGame();
  const { startGame: startSession, submitGame } = useGameSession();
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');

  const handleStart = async () => {
    const res = await startSession('pattern-survival-stage-1');
    const config = res.config || DEFAULT_CONFIG;
    startEngine(res.seed, config);
  };

  const handleSubmit = async () => { await submitGame(round, perfectRounds, score); };
  useEffect(() => { if (phase === 'ended') { handleSubmit(); } }, [phase]);
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
  if (appPhase === 'levels') return <LevelSelector onSelect={() => { setAppPhase('game'); }} onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'daily') return <DailyChallenge onPlay={() => { setAppPhase('game'); }} onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'achievements') return <Achievements onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'stats') return <StatsScreen onBack={() => setAppPhase('menu')} />;
  if (appPhase === 'settings') return <Settings onBack={() => setAppPhase('menu')} />;

  // ─── Game Flow ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold text-center text-white mb-4">Pattern Survival</h1>
      {phase === 'idle' && (
        <InstructionScreen onStart={handleStart} loading={false} />
      )}
      {phase !== 'idle' && (
        <>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-xl mb-4">
            <span className="font-bold text-purple-400">Round: {round + 1}</span>
            <span className="font-bold text-yellow-400">Score: {score}</span>
            <span className={`font-mono font-bold ${secs < 30 ? 'text-red-400' : 'text-green-400'}`}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
          </div>
          {phase === 'showing' && <p className="text-center text-yellow-400 font-bold mb-4 animate-pulse">Watch the pattern...</p>}
          {phase === 'input' && <p className="text-center text-green-400 font-bold mb-4">Your turn! Repeat the pattern</p>}
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {cellColors.map((color, idx) => (
              <motion.button key={idx} onClick={() => tapCell(idx)} disabled={phase !== 'input'}
                animate={{ scale: highlightIdx === idx ? 1.2 : 1, opacity: highlightIdx === idx ? 1 : 0.7 }}
                className={`aspect-square rounded-xl ${COLOR_MAP[color]} ${highlightIdx === idx ? 'ring-4 ring-white' : ''} ${phase === 'input' ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed'} transition-all`}
              />
            ))}
          </div>
          {phase === 'ended' && (
            <ResultScreen score={score} success={true} onReplay={() => setAppPhase('menu')} />
          )}
        </>
      )}
    </div>
  );
}
