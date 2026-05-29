// /config/gameConfig.types.ts
import type { InstructionContentPayload } from "@/types/instruction-api";
import { z } from "zod";

export const GameMetaSchema = z.object({
  name: z.string(),
  logo: z.string(),
  tagline: z.string(),
  description: z.string(),
});

export const GameTypeSchema = z.enum(["INFINITY_LOOP"]);

export const GameSettingsSchema = z.object({
  initialDifficulty: z.enum(["easy", "medium", "hard"]),
  gameType: GameTypeSchema,
  stageId: z.string().min(1).nullable(),
  timeLimitSeconds: z.number().int().positive().optional(),
  gridSizes: z.object({
    easy: z.number(),
    medium: z.number(),
    hard: z.number(),
  }),
  levelPalettes: z.array(
    z.object({
      primary: z.string(),
      glow: z.string(),
      background: z.string(),
    }),
  ),
  dynamicColors: z.boolean().default(true),
  audio: z.object({
    defaultTapVolume: z.number(),
    defaultAmbienceVolume: z.number(),
    backgroundTrackUrl: z.string(),
    tapSoundUrl: z.string(),
    successSoundUrl: z.string(),
  }),
});

export const GameConfigSchema = z.object({
  gameMeta: GameMetaSchema,
  settings: GameSettingsSchema,
});

export type GameConfig = z.infer<typeof GameConfigSchema>;
export type GameType = z.infer<typeof GameTypeSchema>;

export interface GameConfigFetchResult {
  readonly gameConfig: GameConfig;
  readonly instructionOverride: Partial<InstructionContentPayload> | null;
}
