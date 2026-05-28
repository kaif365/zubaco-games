import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateBoardSchema = z.object({
    boardId: z.string().uuid(),
    name: z.string().min(1).max(100),
    gridSize: z.object({ x: z.number().int().min(2).max(20), y: z.number().int().min(2).max(20) }),
    fileUrl: z.string().min(1),
    shuffles: z.array(z.array(z.number().int().min(-1).max(398))).min(1),
});

export class UpdateBoardDto extends createZodDto(UpdateBoardSchema) {}
