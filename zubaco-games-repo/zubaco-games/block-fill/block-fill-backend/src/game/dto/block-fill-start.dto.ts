import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BlockFillStartSchema = z.object({
    levelId: z.string().uuid(),
});

export class BlockFillStartDto extends createZodDto(BlockFillStartSchema) {}
export type BlockFillStartPayload = z.infer<typeof BlockFillStartSchema>;
