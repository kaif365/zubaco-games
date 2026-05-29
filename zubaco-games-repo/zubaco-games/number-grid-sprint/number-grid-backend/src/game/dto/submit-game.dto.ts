import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
const AnswerSchema = z.object({ row: z.number().int().min(0), col: z.number().int().min(0), value: z.number().int().min(1), timestamp: z.number() });
const SubmitSchema = z.object({ gameSessionId: z.string().uuid(), answers: z.array(AnswerSchema).max(100), clientScore: z.number().int().min(0) });
export class SubmitGameDto extends createZodDto(SubmitSchema) {}
