import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StartGameSchema = z.object({
    stageId: z.string().trim().min(1, 'stageId is required'),
    level: z.number().int().min(1).max(10).optional(),
});

export class StartGameDto extends createZodDto(StartGameSchema) {}
export type StartGamePayload = z.infer<typeof StartGameSchema>;
