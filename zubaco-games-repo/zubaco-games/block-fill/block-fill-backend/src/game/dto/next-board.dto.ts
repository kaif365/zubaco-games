import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const NextBoardSchema = z.object({
    sessionId: z.string().uuid(),
    requestedDemoRound: z.number().int().min(0).optional(),
    requestedActualRound: z.number().int().min(0).optional(),
});

export class NextBoardDto extends createZodDto(NextBoardSchema) {}
