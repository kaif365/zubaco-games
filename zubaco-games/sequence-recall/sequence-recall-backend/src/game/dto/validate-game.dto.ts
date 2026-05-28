import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ValidateGameSchema = z.object({
    gameSessionId: z.string().trim().min(1, 'gameSessionId is required'),
    roundNumber: z.number().int().min(0, 'roundNumber must be greater than or equal to 0'),
    playerSequence: z.array(z.number().int().positive()).min(1, 'playerSequence is required'),
    sequenceEvents: z
        .array(
            z.object({
                sequence: z.number().int().positive('sequence must be a positive integer'),
                sequenceTimestamp: z.string(),
            }),
        )
        .optional(),
    timestamp: z.string(),
    isCorrect: z.boolean(),
});

export class ValidateGameDto extends createZodDto(ValidateGameSchema) {}
export type ValidateGamePayload = z.infer<typeof ValidateGameSchema>;
