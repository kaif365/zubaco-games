import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const StartGameSchema = z.object({ stageId: z.string().uuid(), level: z.number().int().min(1).max(10).optional() });
export class StartGameDto extends createZodDto(StartGameSchema) {}
