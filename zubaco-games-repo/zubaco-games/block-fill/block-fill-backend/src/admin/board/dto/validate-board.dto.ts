import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { BoardNodeSchema } from './create-board.dto';

export const ValidateBoardSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    levelId: z.string().uuid().optional(),
    gridRow: z.number().int().min(1),
    gridCol: z.number().int().min(1),
    nodes: z.array(BoardNodeSchema).min(1),
});

export class ValidateBoardDto extends createZodDto(ValidateBoardSchema) {}
