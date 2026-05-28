import { INT4_MAX } from '@common/constants';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StageLevelSchema = z.object({
    levelId: z.string().uuid(),
    boardCount: z.number().int().min(1).max(1000),
    displayTime: z.number().int().min(1).max(86400),
    maxScore: z.number().int().min(1).max(INT4_MAX),
});

const DemoStageLevelSchema = z.object({
    levelId: z.string().uuid(),
    boardCount: z.number().int().min(1).max(1000),
    displayTime: z.number().int().min(1).max(86400),
});

export const UpsertStageConfigSchema = z.object({
    stageId: z.string().min(1),
    timeLimit: z.number().int().min(1).max(86400),
    maxTimeBonus: z.number().int().min(1).max(INT4_MAX),
    enableDemo: z.boolean().default(false),
    enableNumbers: z.boolean().default(true),
    demoLevels: z.array(DemoStageLevelSchema).default([]),
    levels: z.array(StageLevelSchema).min(1),
});

export class UpsertStageConfigDto extends createZodDto(UpsertStageConfigSchema) {}
