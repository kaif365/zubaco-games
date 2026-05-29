import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AnswerSchema = z.object({
  itemIndex: z.number().int().min(0),
  chosenSide: z.enum(['left', 'right']),
  timestamp: z.number(),
  correct: z.boolean(),
});

const SubmitResultSchema = z.object({
  gameSessionId: z.string().uuid(),
  answers: z.array(AnswerSchema).max(100),
  clientScore: z.number().int().min(0),
});

export class SubmitResultDto extends createZodDto(SubmitResultSchema) {}
