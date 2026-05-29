import { INT4_MAX } from '@common/constants';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateLevelSchema = z.object({
    levelId: z.string().uuid(),
    name: z.string().min(1).max(100),
    difficultyScore: z.number().int().min(0).max(INT4_MAX),
});

export class UpdateLevelDto extends createZodDto(UpdateLevelSchema) {}
