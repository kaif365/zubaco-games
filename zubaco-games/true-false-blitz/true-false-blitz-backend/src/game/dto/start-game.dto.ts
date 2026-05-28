import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StartGameSchema = z.object({
  stageId: z.string().min(1),
  level: z.number().int().min(1).max(10).optional(),
});

export class StartGameDto extends createZodDto(StartGameSchema) {}
