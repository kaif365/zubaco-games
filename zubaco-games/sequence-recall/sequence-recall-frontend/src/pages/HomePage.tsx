import { useCallback, useEffect, useState } from 'react';

import { IMAGES } from '@/assets/images';
import { SequenceRecallGameShell } from '@features/sequence-recall/components/SequenceRecallGameShell';
import { MenuScreen, type AppPhase } from '@features/sequence-recall/components/MenuScreen';
import { LevelSelector } from '@features/sequence-recall/components/LevelSelector';
import { Settings } from '@features/sequence-recall/components/Settings';
import { StatsScreen } from '@features/sequence-recall/components/StatsScreen';
import { Achievements } from '@features/sequence-recall/components/Achievements';
import { DailyChallenge } from '@features/sequence-recall/components/DailyChallenge';
import { PauseDialog } from '@features/sequence-recall/components/PauseDialog';
import { Confetti } from '@features/sequence-recall/components/Confetti';
import '@styles/sequence-recall.css';

export default function HomePage() {
  const [appPhase, setAppPhase] = useState<AppPhase>('menu');
  const [isDaily, setIsDaily] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape) and (max-height: 610px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsCompactLandscape(event.matches);
    };
    setIsCompactLandscape(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
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

  const handleStartDaily = useCallback((_seed: number) => {
    setIsDaily(true);
    setAppPhase('game');
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
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
        return <SequenceRecallGameShell isDaily={isDaily} />;
      default:
        return <MenuScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <main className="flex h-[100dvh] overflow-hidden w-full items-center justify-center bg-mainbackground">
      <div className="absolute inset-0 gradient-layer-top" />
      {isCompactLandscape ? (
        <div className="w-full  flex flex-col items-center justify-center px-4 text-center backdrop-blur">
          <div
            className="pointer-events-none absolute inset-0 scale-150 bg-contain bg-center bg-no-repeat opacity-20 h-full md:h-[80vh] top-1/2 -translate-y-1/2"
            style={{ backgroundImage: `url('${IMAGES.brownBg}')` }}
          />
          <div className="phone" />
          <div className="message">
            <p className="text-lg tracking-[0.14em] gradient-text uppercase font-bold">
              Tilt detected!
            </p>
            <p className="max-w-[340px] mx-auto text-center text-[14px] tracking-[0.13em] text-white/80">
              Switch to portrait mode to keep playing
            </p>
          </div>
        </div>
      ) : (
        renderPhase()
      )}
      {isPaused && (
        <PauseDialog onResume={handleResume} onRestart={handleRestart} onQuit={handleQuit} />
      )}
      <Confetti active={showConfetti} />
    </main>
  );
}
