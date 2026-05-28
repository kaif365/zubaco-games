import { TiltOverlay } from '@/components/TiltOverlay';
import { GameClearModal } from '@/components/shared/GameClearModal';
import { APP_SCREENS, SESSION_STORAGE_KEY } from '@/constants/game.constants';
import { useCompactLandscape } from '@/hooks/useCompactLandscape';
import { useGameConfig } from '@/hooks/useGameConfig';
import { useDemoLevels } from '@/hooks/useDemoLevels';
import { useMemoryCardBgm } from '@/hooks/useMemoryCardBgm';
import { useStageContent } from '@/hooks/useStageContent';
import { disableCopyAndSelection, disableDevTools } from '@/lib/disableDevTools';
import { useLocalizedMicroScreenContent } from '@/lib/i18n/micro-screen-content';
import type { AppScreen, GameOverStats } from '@/models/game.types';
import { DemoScreen } from '@/screens/DemoScreen';
import { GameOverScreen } from '@/screens/GameOverScreen';
import { GameplayScreen } from '@/screens/GameplayScreen';
import { InstructionsScreen } from '@/screens/InstructionsScreen';
import { InstructionsSkeleton } from '@/screens/InstructionsSkeleton';
import { MenuScreen } from '@/features/memory-card/components/MenuScreen';
import { LevelSelector } from '@/features/memory-card/components/LevelSelector';
import { Settings } from '@/features/memory-card/components/Settings';
import { StatsScreen } from '@/features/memory-card/components/StatsScreen';
import { Achievements } from '@/features/memory-card/components/Achievements';
import { DailyChallenge } from '@/features/memory-card/components/DailyChallenge';
import { buildGameThemeStyle } from '@/utils/gameThemeStyle';
import { STAGE_THEME_COLORS } from '@micro-screens/src';
import type { StageId } from '@micro-screens/src/types/stage-theme';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AppState {
  screen: AppScreen;
  gameOverStats: GameOverStats | null;
  gameKey: number;
}

const INITIAL_STATE: AppState = {
  screen: APP_SCREENS.MENU,
  gameOverStats: null,
  gameKey: 0,
};

export function App() {
  const { t } = useTranslation();
  const [appState, setAppState] = useState<AppState>(() => {
    const hasStoredSession = Boolean(localStorage.getItem(SESSION_STORAGE_KEY));
    return hasStoredSession
      ? { screen: APP_SCREENS.GAMEPLAY, gameOverStats: null, gameKey: 1 }
      : INITIAL_STATE;
  });
  const isCompactLandscape = useCompactLandscape();
  const { config } = useGameConfig();
  const { isEmpty: isDemoEmpty } = useDemoLevels();
  const bootstrapStage = useMemo((): StageId => {
    const parsed = Number(import.meta.env.VITE_STAGE_NUMBER);
    return parsed >= 1 && parsed <= 7 ? (parsed as StageId) : 1;
  }, []);
  const { instructionContentByStage, successContentByStage, failureContentByStage } =
    useLocalizedMicroScreenContent();
  const { contentByStage: apiInstructionContentByStage, isLoading: isStageContentLoading } =
    useStageContent(config?.stageNumber, Boolean(config));

  const instructionsContentByStage = useMemo(() => {
    if (!config) return instructionContentByStage;
    const stage = config.stageNumber;
    const apiPartial = apiInstructionContentByStage?.[stage];
    if (!apiPartial) return instructionContentByStage;

    const base = instructionContentByStage?.[stage];
    if (!base) {
      return { ...instructionContentByStage, [stage]: apiPartial };
    }
    return {
      ...instructionContentByStage,
      [stage]: {
        ...base,
        ...apiPartial,
        slides: apiPartial.slides ?? base.slides,
      },
    };
  }, [apiInstructionContentByStage, config, instructionContentByStage]);

  useEffect(() => {
    const cleanupDevTools = disableDevTools();
    const cleanupCopy = disableCopyAndSelection();
    return () => {
      cleanupDevTools();
      cleanupCopy();
    };
  }, []);

  const audioScreenOn =
    appState.screen === APP_SCREENS.DEMO || appState.screen === APP_SCREENS.GAMEPLAY;
  useMemoryCardBgm(audioScreenOn);

  useEffect(() => {
    if (!config) return;
    const theme = STAGE_THEME_COLORS[config.stageNumber] ?? STAGE_THEME_COLORS[1];
    const hexToRgb = (hex: string) => {
      const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '0,0,0';
    };
    const root = document.documentElement;
    root.style.setProperty('--game-bg', theme.background);
    root.style.setProperty('--game-bg-rgb', hexToRgb(theme.background));
    root.style.setProperty('--game-eclipse', theme.eclipse);
    root.style.setProperty('--game-eclipse-rgb', hexToRgb(theme.eclipse));
    root.style.setProperty('--game-accent', theme.resultAccent);
    root.style.setProperty('--game-accent-rgb', hexToRgb(theme.resultAccent));
    root.style.setProperty('--stage-bg', theme.background);
    root.style.setProperty('--stage-eclipse', theme.eclipse);
    root.style.setProperty('--stage-eclipse-rgb', hexToRgb(theme.eclipse));
    root.style.setProperty('--stage-accent', theme.resultAccent);
    root.style.setProperty('--stage-accent-rgb', hexToRgb(theme.resultAccent));
  }, [config]);

  const handlePlayNow = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      screen: APP_SCREENS.GAMEPLAY,
      gameKey: prev.gameKey + 1,
    }));
  }, []);

  const handleLearnHowToPlay = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      screen: APP_SCREENS.DEMO,
      gameKey: prev.gameKey + 1,
    }));
  }, []);

  const goToMenu = useCallback(() => {
    setAppState((prev) => ({ ...prev, screen: APP_SCREENS.MENU }));
  }, []);

  const goToScreen = useCallback((screen: AppScreen) => {
    setAppState((prev) => ({ ...prev, screen }));
  }, []);

  const [showDemoCompleteModal, setShowDemoCompleteModal] = useState(false);

  const goToInstructions = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      screen: APP_SCREENS.INSTRUCTIONS,
    }));
  }, []);

  const handleDemoComplete = useCallback(() => {
    setShowDemoCompleteModal(true);
  }, []);

  const finishDemo = useCallback(() => {
    setShowDemoCompleteModal(false);
    goToInstructions();
  }, [goToInstructions]);

  const handleGameOver = useCallback((stats: GameOverStats) => {
    setAppState((prev) => ({ ...prev, screen: APP_SCREENS.GAME_OVER, gameOverStats: stats }));
  }, []);

  const handleContinue = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setAppState(INITIAL_STATE);
  }, []);

  // TODO(temp): 401 dev-session refresh — remove when real auth is in place
  useEffect(() => {
    const h = () => {
      setAppState(INITIAL_STATE);
    };
    window.addEventListener('app:unauthorized', h);
    return () => {
      window.removeEventListener('app:unauthorized', h);
    };
  }, []);
  // end TODO(temp)

  if (!config) {
    return (
      <main className="memory-match-shell" style={buildGameThemeStyle(bootstrapStage)}>
        <div className="background-layer" aria-hidden />
        <InstructionsSkeleton stage={bootstrapStage} />
      </main>
    );
  }

  return (
    <div className="app" style={{ display: 'contents' }}>
      <div className="background-layer" aria-hidden />
      {isCompactLandscape && <TiltOverlay />}
      <div className="pointer-events-none absolute inset-0 bg-glow h-60 w-full gradient-layer-top"></div>
      <div className="game-shell">
        {appState.screen === APP_SCREENS.MENU && (
          <MenuScreen
            onPlay={() => goToScreen(APP_SCREENS.INSTRUCTIONS)}
            onLevels={() => goToScreen(APP_SCREENS.LEVELS)}
            onDaily={() => goToScreen(APP_SCREENS.DAILY)}
            onAchievements={() => goToScreen(APP_SCREENS.ACHIEVEMENTS)}
            onStats={() => goToScreen(APP_SCREENS.STATS)}
            onSettings={() => goToScreen(APP_SCREENS.SETTINGS)}
          />
        )}

        {appState.screen === APP_SCREENS.LEVELS && (
          <LevelSelector onSelect={() => handlePlayNow()} onBack={goToMenu} />
        )}

        {appState.screen === APP_SCREENS.DAILY && (
          <DailyChallenge onPlay={handlePlayNow} onBack={goToMenu} />
        )}

        {appState.screen === APP_SCREENS.ACHIEVEMENTS && (
          <Achievements onBack={goToMenu} />
        )}

        {appState.screen === APP_SCREENS.STATS && (
          <StatsScreen onBack={goToMenu} />
        )}

        {appState.screen === APP_SCREENS.SETTINGS && (
          <Settings onBack={goToMenu} />
        )}

        {appState.screen === APP_SCREENS.INSTRUCTIONS &&
          (isStageContentLoading ? (
            <InstructionsSkeleton stage={config.stageNumber} />
          ) : (
            <InstructionsScreen
              stage={config.stageNumber}
              onPlayNow={handlePlayNow}
              onLearnHowToPlay={handleLearnHowToPlay}
              hideLearnHowToPlay={!config.showDemo || isDemoEmpty}
              contentByStage={instructionsContentByStage}
            />
          ))}

        {appState.screen === APP_SCREENS.DEMO && (
          <DemoScreen
            key={appState.gameKey}
            onDemoComplete={handleDemoComplete}
            onDemoSkip={goToInstructions}
          />
        )}

        {appState.screen === APP_SCREENS.GAMEPLAY && (
          <GameplayScreen
            key={appState.gameKey}
            onGameOver={handleGameOver}
            onSessionExpired={handleContinue}
          />
        )}

        {appState.screen === APP_SCREENS.GAME_OVER && appState.gameOverStats && (
          <GameOverScreen
            stats={appState.gameOverStats}
            stage={config.stageNumber}
            contentByStage={
              appState.gameOverStats.result === 'win'
                ? successContentByStage
                : failureContentByStage
            }
            onContinue={handleContinue}
          />
        )}
      </div>

      {showDemoCompleteModal && (
        <GameClearModal
          title={t('demo.demoCleared')}
          accentColor={(STAGE_THEME_COLORS[config.stageNumber] ?? STAGE_THEME_COLORS[1]).resultAccent}
          eclipseColor={(STAGE_THEME_COLORS[config.stageNumber] ?? STAGE_THEME_COLORS[1]).eclipse}
          onConfirm={finishDemo}
        />
      )}
    </div>
  );
}
