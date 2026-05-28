import { DEFAULT_GAME_CONFIG } from "@/config/game-config";

const defaultPaletteFirst = DEFAULT_GAME_CONFIG.settings.levelPalettes[0];
if (!defaultPaletteFirst?.primary) {
  throw new Error(
    "DEFAULT_GAME_CONFIG.settings.levelPalettes[0].primary is required",
  );
}

/** Accent fallback when runtime hex is missing — mirrors first `levelPalettes` entry. */
export const DEFAULT_LEVEL_PALETTE_PRIMARY = defaultPaletteFirst.primary;
