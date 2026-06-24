import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ActivateBoosterSchema = z.object({
    sessionId: z.string().uuid(),
    boosterType: z.enum(['TIME_FREEZE', 'HINT', 'SKIP', 'DOUBLE_POINTS', 'UNDO']),
});

export class ActivateBoosterDto extends createZodDto(ActivateBoosterSchema) {}
