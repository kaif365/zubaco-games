import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const TapSchema = z.object({
  cellId: z.number().int().min(0),
  isCorrect: z.boolean(),
  timestamp: z.number(),
});

const SubmitResultSchema = z.object({
  gameSessionId: z.string().uuid(),
  taps: z.array(TapSchema).max(500),
  clientScore: z.number().int().min(0),
});

export class SubmitResultDto extends createZodDto(SubmitResultSchema) {}
