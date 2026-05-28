import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ListLevelsSchema = z.object({
    skip: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
});

export class ListLevelsDto extends createZodDto(ListLevelsSchema) {}
