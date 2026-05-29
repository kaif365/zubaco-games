import { useCallback, useState } from 'react';
import { MenuScreen, type AppPhase } from '../features/typing/components/MenuScreen';
import { LevelSelector } from '../features/typing/components/LevelSelector';
import { Settings } from '../features/typing/components/Settings';
import { StatsScreen } from '../features/typing/components/StatsScreen';
import { Achievements } from '../features/typing/components/Achievements';
import { DailyChallenge } from '../features/typing/components/DailyChallenge';
import { PauseDialog } from '../features/typing/components/PauseDialog';
import { Confetti } from '../features/typing/components/Confetti';
import { GameBoard } from '../features/typing/components/GameBoard';

export function GamePage() {
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
        return <GameBoard onReturnToMenu={handleBackToMenu} />;
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
