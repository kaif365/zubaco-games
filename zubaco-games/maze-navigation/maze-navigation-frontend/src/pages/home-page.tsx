import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import { GameInstructionsScreen } from "@/section/instructions/instructions-screen";
import { GameInstructionsSkeleton } from "@/section/instructions/instructions-skeleton";
import { useDemoStore } from "@/store/demo";
import { useLiveStore } from "@/store/live";
import { useSettingsStore } from "@/store/settings";
import { getConfiguredUiStageId } from "@/utils/stage/stage-utils";
import { paths } from "@app/router/routes";

import { MenuScreen } from "@/features/maze-navigation/components/MenuScreen";
import { LevelSelector } from "@/features/maze-navigation/components/LevelSelector";
import { Settings } from "@/features/maze-navigation/components/Settings";
import { StatsScreen } from "@/features/maze-navigation/components/StatsScreen";
import { Achievements } from "@/features/maze-navigation/components/Achievements";
import { DailyChallenge } from "@/features/maze-navigation/components/DailyChallenge";

type HomePhase = 'menu' | 'instructions' | 'levels' | 'daily' | 'achievements' | 'stats' | 'settings';

export default function HomePage() {
  const navigate = useNavigate();
  const stageId = getConfiguredUiStageId();
  const [phase, setPhase] = useState<HomePhase>('menu');
  const { isBootstrapReady, instructionContentOverride: instructionOverride } =
    useSettingsStore(
      useShallow((s) => ({
        isBootstrapReady: s.isBootstrapReady,
        instructionContentOverride: s.instructionContentOverride,
      })),
    );
  const resetDemo = useDemoStore((s) => s.resetGame);
  const loadDemo = useDemoStore((s) => s.loadDemo);
  const demoSession = useDemoStore((s) => s.demoSession);
  const startLiveGame = useLiveStore((s) => s.startGame);
  const prepareLiveGameRouteEntry = useLiveStore(
    (s) => s.prepareLiveGameRouteEntry,
  );
  const hasRequestedDemoRef = useRef(false);

  useEffect(() => {
    if (!isBootstrapReady || hasRequestedDemoRef.current) {
      return;
    }

    hasRequestedDemoRef.current = true;
    loadDemo().catch(() => {
      // Errors are handled inside demo store / service.
    });
  }, [isBootstrapReady, loadDemo]);

  const isContentLoading = !isBootstrapReady;

  if (isContentLoading) {
    return <GameInstructionsSkeleton stage={stageId} />;
  }

  const handleStartGame = async () => {
    prepareLiveGameRouteEntry(stageId);
    try {
      await startLiveGame();
    } catch {
      // API errors are toasted via handleServerError in game services.
    }
    navigate(paths.game);
  };

  switch (phase) {
    case 'menu':
      return (
        <MenuScreen
          onPlay={() => setPhase('instructions')}
          onLevels={() => setPhase('levels')}
          onDaily={() => setPhase('daily')}
          onAchievements={() => setPhase('achievements')}
          onStats={() => setPhase('stats')}
          onSettings={() => setPhase('settings')}
        />
      );

    case 'levels':
      return <LevelSelector onSelect={() => handleStartGame()} onBack={() => setPhase('menu')} />;

    case 'daily':
      return <DailyChallenge onPlay={() => { sessionStorage.setItem('maze_daily_active', '1'); handleStartGame(); }} onBack={() => setPhase('menu')} />;

    case 'achievements':
      return <Achievements onBack={() => setPhase('menu')} />;

    case 'stats':
      return <StatsScreen onBack={() => setPhase('menu')} />;

    case 'settings':
      return <Settings onBack={() => setPhase('menu')} />;

    case 'instructions':
    default:
      return (
        <GameInstructionsScreen
          stage={stageId}
          contentByStage={instructionOverride ?? undefined}
          onLearnHowToPlay={demoSession?.enableDemo === true ? () => {
            resetDemo(stageId);
            navigate(paths.demo);
          } : undefined}
          onPlayNow={handleStartGame}
        />
      );
  }
}
