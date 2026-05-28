import { z } from 'zod';
const AnswerSchema = z.object({ questionId: z.number(), userAnswer: z.string().max(200), timestamp: z.number(), responseTimeMs: z.number() });
export const SubmitGameSchema = z.object({ gameSessionId: z.string().uuid(), answers: z.array(AnswerSchema).max(30), clientScore: z.number() });
export type SubmitGameDto = z.infer<typeof SubmitGameSchema>;
