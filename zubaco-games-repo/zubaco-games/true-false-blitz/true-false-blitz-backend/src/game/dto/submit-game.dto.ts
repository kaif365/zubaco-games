import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AnswerSchema = z.object({
  statementIndex: z.number().int().min(0),
  chosenTrue: z.boolean(),
  correct: z.boolean(),
  timestamp: z.number(),
});

const SubmitGameSchema = z.object({
  gameSessionId: z.string().uuid(),
  answers: z.array(AnswerSchema).max(60),
  clientScore: z.number().int().min(0),
});

export class SubmitGameDto extends createZodDto(SubmitGameSchema) {}
