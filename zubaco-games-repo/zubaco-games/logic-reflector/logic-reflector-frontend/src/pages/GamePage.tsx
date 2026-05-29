import { lazy, Suspense, useState, useCallback } from 'react';
import { PageLoader } from '@/components/shared/PageLoader';
import { resolveStage } from '@/utils/stage-config';
import { MenuScreen } from '@/features/game/components/MenuScreen';
import { LevelSelector, getHighestLevel, setHighestLevel, getLevelStars, setLevelStars, LEVELS, type LevelConfig } from '@/features/game/components/LevelSelector';
import { Settings } from '@/features/game/components/Settings';
import { StatsScreen, updateStats } from '@/features/game/components/StatsScreen';
import { Achievements, AchievementPopup, checkAchievements, type AchievementId } from '@/features/game/components/Achievements';
import { DailyChallenge, isDailyCompleted, completeDailyChallenge, getDailyLevel } from '@/features/game/components/DailyChallenge';
import { PauseDialog } from '@/features/game/components/PauseDialog';
import { Confetti } from '@/features/game/components/Confetti';

const GameContainer = lazy(
  () => import('@/features/game/components/GameContainer'),
);

// Resolved once at module load — URL param or VITE_STAGE_NO or fallback 5
const STAGE = resolveStage();

type AppPhase =
  | 'tutorial'
  | 'menu'
  | 'levels'
  | 'settings'
  | 'stats'
  | 'achievements'
  | 'daily'
  | 'playing';

export default function GamePage() {
  const [phase, setPhase] = useState<AppPhase>(() => {
    return localStorage.getItem('logic-reflector-tutorial-seen') === 'true' ? 'menu' : 'menu';
  });
  const [unlockedAchievement, setUnlockedAchievement] = useState<AchievementId | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handlePlay = useCallback(() => {
    // Mark tutorial as seen (the existing GameContainer has its own demo flow)
    localStorage.setItem('logic-reflector-tutorial-seen', 'true');
    setPhase('playing');
  }, []);

  const handleLevelSelect = useCallback((_config: LevelConfig) => {
    // The existing GameContainer manages levels via API — just go to playing
    localStorage.setItem('logic-reflector-tutorial-seen', 'true');
    setPhase('playing');
  }, []);

  const handleDailyPlay = useCallback(() => {
    localStorage.setItem('logic-reflector-tutorial-seen', 'true');
    setPhase('playing');
  }, []);

  const handleExitToMenu = useCallback(() => {
    setPhase('menu');
  }, []);

  return (
    <>
      <AchievementPopup achievementId={unlockedAchievement} onDismiss={() => setUnlockedAchievement(null)} />
      <Confetti active={showConfetti} />

      {phase === 'menu' && (
        <MenuScreen
          onPlay={handlePlay}
          onLevels={() => setPhase('levels')}
          onDaily={() => setPhase('daily')}
          onAchievements={() => setPhase('achievements')}
          onStats={() => setPhase('stats')}
          onSettings={() => setPhase('settings')}
        />
      )}

      {phase === 'levels' && <LevelSelector onSelect={handleLevelSelect} onBack={() => setPhase('menu')} />}
      {phase === 'settings' && <Settings onBack={() => setPhase('menu')} />}
      {phase === 'stats' && <StatsScreen onBack={() => setPhase('menu')} />}
      {phase === 'achievements' && <Achievements onBack={() => setPhase('menu')} />}
      {phase === 'daily' && <DailyChallenge onPlay={handleDailyPlay} onBack={() => setPhase('menu')} />}

      {phase === 'playing' && (
        <Suspense fallback={<PageLoader />}>
          <GameContainer stage={STAGE} />
        </Suspense>
      )}
    </>
  );
}
