import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BoardPointSchema = z.object({
    row: z.number().int().min(0),
    col: z.number().int().min(0),
});

export const BoardNodeSchema = z.object({
    colorCode: z.string().min(1),
    points: z.tuple([BoardPointSchema, BoardPointSchema]),
});

const BaseBoardSchema = {
    levelId: z.string().uuid(),
    name: z.string().min(1).max(100),
    gridRow: z.number().int().min(1),
    gridCol: z.number().int().min(1),
};

export const CreateBoardSchema = z.object({
    ...BaseBoardSchema,
    nodes: z.array(BoardNodeSchema).min(1),
});

export class CreateBoardDto extends createZodDto(CreateBoardSchema) {}
