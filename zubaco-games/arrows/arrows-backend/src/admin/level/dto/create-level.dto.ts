import { INT4_MAX } from '@common/constants';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateLevelSchema = z.object({
    name: z.string().min(1).max(100),
    difficultyScore: z.number().int().min(0).max(INT4_MAX),
});

export class CreateLevelDto extends createZodDto(CreateLevelSchema) {}
