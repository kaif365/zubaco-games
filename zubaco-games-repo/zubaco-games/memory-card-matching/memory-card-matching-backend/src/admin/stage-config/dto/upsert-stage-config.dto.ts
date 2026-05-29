import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const StageLevelSchema = z.object({
  difficultyId: z.string().uuid(),
  boardCount: z.number().int().min(1).max(1000),
});

export const UpsertStageConfigSchema = z.object({
  stageId: z.string().min(1).default("default"),
  timeLimit: z.number().int().min(1),
  enableDemo: z.boolean().default(false),
  demoLevels: z.array(StageLevelSchema).default([]),
  levels: z.array(StageLevelSchema).min(1),
});

export class UpsertStageConfigDto extends createZodDto(
  UpsertStageConfigSchema,
) {}
