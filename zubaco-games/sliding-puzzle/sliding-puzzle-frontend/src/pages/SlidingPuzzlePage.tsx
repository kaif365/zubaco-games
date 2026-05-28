import { Suspense, lazy, useCallback, useEffect, useState } from 'react';

import { ErrorBoundary } from '@components/shared/ErrorBoundary';
import { PageLoader } from '@components/shared/PageLoader';
import { MenuScreen, type AppPhase } from '@features/game/components/MenuScreen';
import { LevelSelector } from '@features/game/components/LevelSelector';
import { Settings } from '@features/game/components/Settings';
import { StatsScreen } from '@features/game/components/StatsScreen';
import { Achievements } from '@features/game/components/Achievements';
import { DailyChallenge } from '@features/game/components/DailyChallenge';
import { PauseDialog } from '@features/game/components/PauseDialog';
import { Confetti } from '@features/game/components/Confetti';

const GameContainer = lazy(() => import('@features/game/components/GameContainer'));

export default function SlidingPuzzlePage() {
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handler = () => setAppPhase('menu');
    window.addEventListener('sliding-puzzle:return-to-menu', handler);
    return () => window.removeEventListener('sliding-puzzle:return-to-menu', handler);
  }, []);

  const handleNavigate = useCallback((phase: AppPhase) => {
    setAppPhase(phase);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setAppPhase('menu');
  }, []);

  const handleSelectLevel = useCallback((_level: number) => {
    setAppPhase('game');
  }, []);

  const handleStartDaily = useCallback(() => {
    setAppPhase('game');
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleRestart = useCallback(() => {
    setIsPaused(false);
    setAppPhase('game');
  }, []);

  const handleQuit = useCallback(() => {
    setIsPaused(false);
    setAppPhase('menu');
  }, []);

  const renderPhase = () => {
    switch (appPhase) {
      case 'menu':
        return <MenuScreen onNavigate={handleNavigate} />;
      case 'levels':
        return <LevelSelector onBack={handleBackToMenu} onSelectLevel={handleSelectLevel} />;
      case 'settings':
        return <Settings onBack={handleBackToMenu} />;
      case 'stats':
        return <StatsScreen onBack={handleBackToMenu} />;
      case 'achievements':
        return <Achievements onBack={handleBackToMenu} />;
      case 'daily':
        return <DailyChallenge onBack={handleBackToMenu} onStartDaily={handleStartDaily} />;
      case 'game':
        return (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <GameContainer />
            </Suspense>
          </ErrorBoundary>
        );
      default:
        return <MenuScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      {renderPhase()}
      {isPaused && (
        <PauseDialog onResume={handleResume} onRestart={handleRestart} onQuit={handleQuit} />
      )}
      <Confetti active={showConfetti} />
    </>
  );
}
