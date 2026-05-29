import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const StageLevelConfigSchema = z.object({
  levelId: z.string().uuid(),
  boardCount: z.number().int().min(1),
  order: z.number().int().min(1),
});

export const CreateStageConfigSchema = z.object({
  stageId: z.string().min(1),
  timeLimit: z.number().int().min(30).max(3600),
  levels: z.array(StageLevelConfigSchema).min(1),
  enableDemo: z.boolean().default(false),
  demoLevels: z.array(StageLevelConfigSchema).optional().default([]),
});

export class CreateStageConfigDto extends createZodDto(
  CreateStageConfigSchema,
) {}

export const UpdateStageConfigSchema = z.object({
  stageId: z.string().min(1),
  timeLimit: z.number().int().min(30).max(3600).optional(),
  levels: z.array(StageLevelConfigSchema).min(1).optional(),
  enableDemo: z.boolean().optional(),
  demoLevels: z.array(StageLevelConfigSchema).optional(),
});

export class UpdateStageConfigDto extends createZodDto(
  UpdateStageConfigSchema,
) {}
