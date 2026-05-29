import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class StartGameDto extends createZodDto(z.object({ stageId: z.string().min(1), level: z.number().int().min(1).max(10).optional() })) {}
