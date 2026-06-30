import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const TapSchema = z.object({
  cellId: z.number().int().min(0).max(10000),
  isCorrect: z.boolean(),
  timestamp: z.number().int().min(0),
});

const SubmitResultSchema = z.object({
  gameSessionId: z.string().uuid(),
  taps: z.array(TapSchema).max(500),
  clientScore: z.number().int().min(0).max(1_000_000),
});

export class SubmitResultDto extends createZodDto(SubmitResultSchema) {}
