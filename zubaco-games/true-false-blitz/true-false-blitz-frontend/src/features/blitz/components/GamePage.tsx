import { useState, useEffect, useCallback } from 'react';
import type { StageConfig } from '@/types/game';
import { useGameSession } from '../hooks/useGameSession';
import { useBlitz } from '../hooks/useBlitz';
import { StatementCard } from './StatementCard';
import { AnswerButtons } from './AnswerButtons';
import { GameHeader } from './GameHeader';
import { InstructionScreen } from '@/components/InstructionScreen';
import { ResultScreen } from '@/components/ResultScreen';
import { MenuScreen } from './MenuScreen';
import { LevelSelector } from './LevelSelector';
import { DailyChallenge, markDailyComplete } from './DailyChallenge';
import { Achievements } from './Achievements';
import { StatsScreen } from './StatsScreen';
import { Settings } from './Settings';
import { PauseDialog } from './PauseDialog';
import { Confetti } from './Confetti';

type AppPhase = 'menu' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

const DEFAULT_CONFIG: StageConfig = {
  totalStatements: 30,
  displayTimeMs: 2000,
  timeLimitMs: 60000,
  pointsPerCorrect: 10,
  penaltyPerWrong: 5,
  streakThreshold: 3,
  streakBonus: 5,
};

/* ---------- Inner game component ---------- */
function BlitzGame({ onReturnToMenu, isDaily }: { onReturnToMenu: () => void; isDaily?: boolean }) {
  const [config, setConfig] = useState<StageConfig>(DEFAULT_CONFIG);
  const [seed, setSeed] = useState<number | null>(null);
  const { loading, error, startGame: startSession, submitResult } = useGameSession();
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);

  const blitz = useBlitz(config, seed);

  const handleStart = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const stageId = params.get('stageId') || 'true-false-blitz-stage-1';
    const session = await startSession(stageId);

    if (session) {
      setConfig(session.config || DEFAULT_CONFIG);
      setSeed(session.seed);
      setGameSessionId(session.gameSessionId);
    }
  }, [startSession]);

  // Auto-start game once seed is available
  useEffect(() => {
    if (seed !== null && blitz.phase === 'idle') {
      blitz.startGame();
    }
  }, [seed, blitz.phase, blitz.startGame]);

  // Submit when game finishes
  useEffect(() => {
    if (blitz.phase === 'finished' && blitz.score && gameSessionId) {
      submitResult(gameSessionId, blitz.answers, blitz.score.finalScore);
      if (isDaily) markDailyComplete(blitz.score.finalScore);
    }
  }, [blitz.phase, blitz.score, gameSessionId, blitz.answers, submitResult, isDaily]);

  // Keyboard support
  useEffect(() => {
    if (blitz.phase !== 'playing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') blitz.answer(true);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') blitz.answer(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [blitz.phase, blitz.answer]);

  // Idle / loading screen
  if (blitz.phase === 'idle') {
    return (
      <InstructionScreen onStart={handleStart} loading={loading} />
    );
  }

  // Game Over
  if (blitz.phase === 'finished' && blitz.score) {
    return (
      <>
        <Confetti active={blitz.score.finalScore >= 200} />
        <ResultScreen score={blitz.score.finalScore} success={true} onReplay={onReturnToMenu} isDaily={isDaily} />
      </>
    );
  }

  // Playing
  return (
    <div className="flex flex-col justify-between min-h-screen py-4">
      <GameHeader
        timeRemainingMs={blitz.timeRemainingMs}
        currentIndex={blitz.currentIndex}
        total={config.totalStatements}
        streak={blitz.streak}
        answeredCount={blitz.answers.length}
      />

      <div className="flex-1 flex items-center">
        <div className="w-full">
          <StatementCard
            statement={blitz.currentStatement}
            feedback={blitz.lastFeedback}
            displayTimeMs={config.displayTimeMs}
          />
        </div>
      </div>

      <AnswerButtons
        onAnswer={blitz.answer}
        disabled={blitz.phase !== 'playing'}
      />
    </div>
  );
}

/* ---------- Main GamePage with appPhase state machine ---------- */
export function GamePage() {
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);

  switch (appPhase) {
    case 'menu':
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
    case 'levels':
      return (
        <LevelSelector
          onSelectLevel={() => setAppPhase('game')}
          onBack={() => setAppPhase('menu')}
        />
      );
    case 'daily':
      return (
        <DailyChallenge
          onStart={() => { setIsDaily(true); setAppPhase('game'); }}
          onBack={() => setAppPhase('menu')}
        />
      );
    case 'achievements':
      return <Achievements onBack={() => setAppPhase('menu')} />;
    case 'stats':
      return <StatsScreen onBack={() => setAppPhase('menu')} />;
    case 'settings':
      return <Settings onBack={() => setAppPhase('menu')} />;
    case 'game':
      return <BlitzGame onReturnToMenu={() => { setIsDaily(false); setAppPhase('menu'); }} isDaily={isDaily} />;
  }
}
