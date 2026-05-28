// /modules/game/context/game-context.tsx
"use client";

import {
  GAME_PLAY_SURFACE,
  type GamePlaySurface,
} from "@/constants/game-play-surface";
import { TUTORIAL_LEVEL_COUNT } from "@/constants/game-section";
import { hexToRgba, isHexColor } from "@/lib/color";
import { stageThemeKey } from "@/theme/colors";
import { GameConfig } from "@/types/game-config";
import type {
  GameCompleteResponse,
  GameStartedResponse,
  RotateResponse,
} from "@/types/socket";
import { GridCell } from "@/types/tile";
import React, { createContext, useContext, useMemo } from "react";
import { useAudio } from "../hooks/use-audio-effects";
import { useGameConfig } from "../hooks/use-game-config";
import { useGameState } from "../hooks/use-game-state";

type GameDifficulty = "easy" | "medium" | "hard";

export type { GamePlaySurface };

export type GameProviderProps =
  | {
      readonly children: React.ReactNode;
      readonly surface: typeof GAME_PLAY_SURFACE.TUTORIAL;
      readonly stageId: string;
      readonly enableUserDemoFetch?: boolean;
    }
  | {
      readonly children: React.ReactNode;
      readonly surface: typeof GAME_PLAY_SURFACE.LIVE;
      readonly stageId: string;
    };

interface GameContextType {
  readonly playSurface: GamePlaySurface;
  grid: GridCell[][];
  moves: number;
  tutorialRoundIndex: number;
  isWon: boolean;
  isTimeUp: boolean;
  hasStarted: boolean;
  activeTimeLimitSeconds: number;
  timeLeftSeconds: number;
  score: number | null;
  timeBonus: number | null;
  activeBoardId: string | null;
  hintedCells: { x: number; y: number }[];
  config: GameConfig;
  isLoading: boolean;

  isInstructionsContentLoading: boolean;
  enableDemo: boolean;
  isPlayEnabled: boolean;
  difficulty: GameDifficulty;
  setDifficulty: (d: GameDifficulty) => void;
  rotateTile: (x: number, y: number) => void;
  revertTileRotation: (x: number, y: number) => void;
  triggerHint: () => { x: number; y: number } | null;
  applyGameStartedResponse: (payload: GameStartedResponse) => void;
  applyRotateResolutionMeta: (payload: RotateResponse) => {
    isBoardSolved: boolean;
    isStageComplete: boolean;
  };
  syncGridFromRotatePayload: (payload: RotateResponse) => void;
  applyGameCompletedResponse: (payload: GameCompleteResponse) => void;
  applyServerTimeUpFreeze: () => void;
  startNextBoard: () => boolean;
  beginGame: () => void;
  startNewGame: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (e: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (o: boolean) => void;
  nextLevel: () => void;
  resetToTutorialPhase: () => void;
  theme: { primary: string; glow: string; background: string };
  boardAccentColor: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = (props: GameProviderProps) => {
  const { children, surface, stageId } = props;
  const liveStageId = surface === GAME_PLAY_SURFACE.LIVE ? stageId : null;
  const enableUserDemoFetch =
    surface === GAME_PLAY_SURFACE.TUTORIAL
      ? (props.enableUserDemoFetch ?? true)
      : false;

  const {
    config,
    isLoading,
    isInstructionsContentLoading,
    enableDemo,
    isPlayEnabled,
  } = useGameConfig({
    surface,
    stageId,
    enableUserDemoFetch,
  });
  const [tutorialRoundIndex, setTutorialRoundIndex] = React.useState(0);
  const isTutorialMode = surface === GAME_PLAY_SURFACE.TUTORIAL;

  const paletteCycleIndex = useMemo(() => {
    if (surface === GAME_PLAY_SURFACE.TUTORIAL) {
      return tutorialRoundIndex;
    }
    return (
      TUTORIAL_LEVEL_COUNT +
      (Number.parseInt(stageThemeKey(liveStageId!), 10) - 1)
    );
  }, [surface, tutorialRoundIndex, liveStageId]);

  const [difficulty, setDifficulty] = React.useState<GameDifficulty>("easy");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [volume, setVolume] = React.useState(0.5);
  const timeLimitSeconds = config.settings.timeLimitSeconds ?? 30;

  const gridSize = config.settings.gridSizes[difficulty];
  const gameStateLevelArg = isTutorialMode ? tutorialRoundIndex : 0;
  const game = useGameState(
    gameStateLevelArg,
    gridSize,
    gridSize,
    timeLimitSeconds,
    isTutorialMode,
    isTutorialMode && isLoading,
  );
  const { playTap, playSuccess } = useAudio(soundEnabled, volume);

  const theme = useMemo(() => {
    const palettes = config.settings.levelPalettes;
    const dynamicColors = config.settings.dynamicColors;
    const localPalette = dynamicColors
      ? palettes[paletteCycleIndex % palettes.length]
      : palettes[0];
    const boardColor = dynamicColors ? game.boardAccentColor : null;
    if (!boardColor || !isHexColor(boardColor)) {
      return localPalette;
    }
    return {
      ...localPalette,
      primary: boardColor,
      glow: hexToRgba(boardColor, 0.95),
    };
  }, [
    config.settings.dynamicColors,
    config.settings.levelPalettes,
    game.boardAccentColor,
    paletteCycleIndex,
  ]);

  const rotateTileWithSound = React.useCallback(
    (x: number, y: number) => {
      const wonOnThisMove = game.rotateTile(x, y);
      if (wonOnThisMove === false) {
        playTap();
      }
    },
    [game, playTap],
  );

  const nextLevel = React.useCallback(() => {
    if (!isTutorialMode) return;
    setTutorialRoundIndex((prev) =>
      Math.min(prev + 1, TUTORIAL_LEVEL_COUNT - 1),
    );
  }, [isTutorialMode]);

  const resetToTutorialPhase = React.useCallback(() => {
    if (!isTutorialMode) return;
    setTutorialRoundIndex(0);
  }, [isTutorialMode]);

  React.useEffect(() => {
    if (game.isWon) {
      playSuccess();
    }
  }, [game.isWon, playSuccess]);

  const value = useMemo(
    () => ({
      ...game,
      playSurface: surface,
      tutorialRoundIndex: isTutorialMode ? tutorialRoundIndex : 0,
      rotateTile: rotateTileWithSound,
      config,
      isLoading,
      isInstructionsContentLoading,
      enableDemo,
      isPlayEnabled,
      difficulty,
      setDifficulty: (d: GameDifficulty) => {
        setDifficulty(d);
      },
      soundEnabled,
      setSoundEnabled,
      volume,
      setVolume,
      isSettingsOpen,
      setIsSettingsOpen,
      nextLevel,
      resetToTutorialPhase,
      theme,
      boardAccentColor: game.boardAccentColor,
    }),
    [
      game,
      surface,
      isTutorialMode,
      tutorialRoundIndex,
      rotateTileWithSound,
      config,
      isLoading,
      isInstructionsContentLoading,
      enableDemo,
      isPlayEnabled,
      difficulty,
      soundEnabled,
      volume,
      isSettingsOpen,
      nextLevel,
      resetToTutorialPhase,
      theme,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
