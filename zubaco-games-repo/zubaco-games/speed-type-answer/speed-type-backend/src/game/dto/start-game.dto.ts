import { z } from 'zod';
export const StartGameSchema = z.object({ clientSeed: z.string().min(1), level: z.number().int().min(1).max(10).optional() });
export type StartGameDto = z.infer<typeof StartGameSchema>;
