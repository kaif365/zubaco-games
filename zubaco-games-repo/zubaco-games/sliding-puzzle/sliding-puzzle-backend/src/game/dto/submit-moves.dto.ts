import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MoveSchema = z.object({
    slot: z.number().int().min(0).max(399),
    clickedAt: z.string().datetime(),
    moveId: z.string().uuid(),
});

export const SubmitMovesSchema = z.object({
    moves: z.array(MoveSchema).min(1),
});

export class SubmitMovesDto extends createZodDto(SubmitMovesSchema) {}
