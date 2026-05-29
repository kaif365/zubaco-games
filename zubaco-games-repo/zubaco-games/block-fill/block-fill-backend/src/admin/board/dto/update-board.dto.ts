import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { BoardNodeSchema } from './create-board.dto';

const BaseBoardSchema = {
    boardId: z.string().uuid(),
    levelId: z.string().uuid(),
    name: z.string().min(1).max(100),
    gridRow: z.number().int().min(1),
    gridCol: z.number().int().min(1),
};

export const UpdateBoardSchema = z.object({
    ...BaseBoardSchema,
    nodes: z.array(BoardNodeSchema).min(1),
});

export class UpdateBoardDto extends createZodDto(UpdateBoardSchema) {}

export const UpdateBoardBodySchema = UpdateBoardSchema.omit({ boardId: true });

export class UpdateBoardBodyDto extends createZodDto(UpdateBoardBodySchema) {}
