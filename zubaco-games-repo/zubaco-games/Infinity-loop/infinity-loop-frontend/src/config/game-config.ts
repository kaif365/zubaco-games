// /config/game-config.ts
import { GameConfig } from "@/types/game-config";

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gameMeta: {
    name: "Infinity Loop",
    logo: "/assets/logo.svg",
    tagline: "Relaxing loop puzzle",
    description:
      "A calming loop-based puzzle game where you rotate tiles to create a closed circuit.",
  },
  settings: {
    initialDifficulty: "easy",
    gameType: "INFINITY_LOOP",
    stageId: null,
    timeLimitSeconds: 180,
    gridSizes: {
      easy: 4,
      medium: 6,
      hard: 8,
    },
    dynamicColors: false,
    levelPalettes: [
      {
        primary: "#4c1d95",
        glow: "rgba(132, 76, 29, 0.95)",
        background: "#1A110B",
      },
      {
        primary: "#22F5FF",
        glow: "rgba(34, 245, 255, 0.95)",
        background: "#040814",
      },
      {
        primary: "#FF4FBF",
        glow: "rgba(255, 79, 191, 0.95)",
        background: "#140412",
      },
      {
        primary: "#57FF8A",
        glow: "rgba(87, 255, 138, 0.95)",
        background: "#04130A",
      },
      {
        primary: "#A680FF",
        glow: "rgba(166, 128, 255, 0.95)",
        background: "#090414",
      },
      {
        primary: "#FFD447",
        glow: "rgba(255, 212, 71, 0.95)",
        background: "#140D04",
      },
    ],
    audio: {
      defaultTapVolume: 0.5,
      defaultAmbienceVolume: 0.2,
      backgroundTrackUrl: "/assets/rainglass-drift.mp3",
      tapSoundUrl:
        "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3",
      successSoundUrl:
        "https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3",
    },
  },
};

/**
 * Remote stage-content payloads may omit nested UI fields (`gridSizes`, palettes, audio).
 * Deep-merge with defaults so `config.settings.gridSizes[difficulty]` et al. never crash.
 */
export function mergeGameConfigWithDefaults(
  partial: Partial<GameConfig>,
): GameConfig {
  return {
    ...DEFAULT_GAME_CONFIG,
    ...partial,
    gameMeta: {
      ...DEFAULT_GAME_CONFIG.gameMeta,
      ...partial.gameMeta,
    },
    settings: {
      ...DEFAULT_GAME_CONFIG.settings,
      ...partial.settings,
      gridSizes: {
        ...DEFAULT_GAME_CONFIG.settings.gridSizes,
        ...partial.settings?.gridSizes,
      },
      levelPalettes:
        partial.settings?.levelPalettes &&
        partial.settings.levelPalettes.length > 0
          ? partial.settings.levelPalettes
          : DEFAULT_GAME_CONFIG.settings.levelPalettes,
      audio: {
        ...DEFAULT_GAME_CONFIG.settings.audio,
        ...partial.settings?.audio,
      },
    },
  };
}
