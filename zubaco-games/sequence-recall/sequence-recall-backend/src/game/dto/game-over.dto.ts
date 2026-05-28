import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GameOverSchema = z.object({
    gameSessionId: z.string().trim().min(1, 'gameSessionId is required'),
    reason: z.enum(['COMPLETED', 'TIME_UP', 'WRONG_MOVE']),
    completedRounds: z.number().int().min(0).optional(),
    timestamp: z.string().optional(),
});

export class GameOverDto extends createZodDto(GameOverSchema) {}
export type GameOverPayload = z.infer<typeof GameOverSchema>;
