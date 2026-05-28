import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ListBoardsSchema = z.object({
    levelId: z.string().uuid().optional(),
    gridRow: z.coerce.number().int().min(1).optional(),
    gridCol: z.coerce.number().int().min(1).optional(),
    skip: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
});

export class ListBoardsDto extends createZodDto(ListBoardsSchema) {}
