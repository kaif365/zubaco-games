import { GAME_CONFIGS } from '@common/constants';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MoveSchema = z.object({
    x: z.number().int().min(0).max(999),
    y: z.number().int().min(0).max(999),
    clickedAt: z.string().datetime(),
    moveId: z.string().uuid(),
});

export const SubmitMovesSchema = z.object({
    moves: z.array(MoveSchema).min(1).max(GAME_CONFIGS.SUBMIT_MOVES_MAX_BATCH),
});

export class SubmitMovesDto extends createZodDto(SubmitMovesSchema) {}
