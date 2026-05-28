import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AnswerSchema = z.object({
  wordIndex: z.number().int().min(0),
  solved: z.boolean(),
  selectedOrder: z.array(z.number().int().min(0)),
  timeSpentMs: z.number().int().min(0),
  timestamp: z.number(),
});

const SubmitGameSchema = z.object({
  gameSessionId: z.string().uuid(),
  answers: z.array(AnswerSchema).max(50),
  clientScore: z.number().int().min(0),
});

export class SubmitGameDto extends createZodDto(SubmitGameSchema) {}
