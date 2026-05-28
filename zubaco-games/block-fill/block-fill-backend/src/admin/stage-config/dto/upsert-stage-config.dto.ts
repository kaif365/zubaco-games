import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StageLevelSchema = z.object({
    levelId: z.string().uuid(),
    boardCount: z.number().int().min(1),
});

export const UpsertStageConfigSchema = z
    .object({
        stageId: z.string().min(1),
        timeLimit: z.number().int().min(1),
        enableDemo: z.boolean().default(false),
        demoLevels: z.array(StageLevelSchema).default([]),
        levels: z.array(StageLevelSchema).min(1),
    })
    .refine((value) => value.enableDemo || value.demoLevels.length === 0, {
        message: 'demoLevels must be empty when enableDemo is false',
        path: ['demoLevels'],
    });

export class UpsertStageConfigDto extends createZodDto(UpsertStageConfigSchema) {}
