import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const StartSessionSchema = z.object({
    stageId: z.string().min(1),
});

export class StartSessionDto extends createZodDto(StartSessionSchema) {}
