import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const GenerateBoardSchema = z.object({
    gridX: z.number().int().min(2).max(50),
    gridY: z.number().int().min(2).max(50),
});

export class GenerateBoardDto extends createZodDto(GenerateBoardSchema) {}
