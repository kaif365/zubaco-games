import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ListCheatFlagsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    userId: z.string().uuid().optional(),
    flagType: z.coerce.number().int().optional(),
    gameId: z.coerce.number().int().optional(),
});

export class ListCheatFlagsDto extends createZodDto(ListCheatFlagsSchema) {}
export type ListCheatFlagsPayload = z.infer<typeof ListCheatFlagsSchema>;
