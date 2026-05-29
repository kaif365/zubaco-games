import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const GenerateShufflesSchema = z.object({
    gridX: z.coerce.number().int().min(2).max(20),
    gridY: z.coerce.number().int().min(2).max(20),
    count: z.coerce.number().int().min(1).max(200),
});

export class GenerateShufflesDto extends createZodDto(GenerateShufflesSchema) {}
