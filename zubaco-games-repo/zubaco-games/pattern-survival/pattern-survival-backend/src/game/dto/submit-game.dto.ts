import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class SubmitGameDto extends createZodDto(z.object({ gameSessionId: z.string().uuid(), roundInputs: z.array(z.array(z.number().int().min(0).max(8)).max(500)).max(500), perfectRounds: z.number().int().min(0), clientScore: z.number().int().min(0) })) {}
