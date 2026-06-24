import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().min(1).max(100).optional(),
});

export class ListQueryDto extends createZodDto(ListQuerySchema) {}
export type ListQueryPayload = z.infer<typeof ListQuerySchema>;
