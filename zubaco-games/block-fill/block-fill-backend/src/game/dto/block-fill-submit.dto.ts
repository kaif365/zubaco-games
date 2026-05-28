import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PathPointSchema = z.object({
    x: z.number().int(),
    y: z.number().int(),
});

const SubmittedPathSchema = z.object({
    pairId: z.string().uuid(),
    path: z.array(PathPointSchema).min(2),
});

export const BlockFillSubmitSchema = z.object({
    paths: z.array(SubmittedPathSchema).min(1),
});

export class BlockFillSubmitDto extends createZodDto(BlockFillSubmitSchema) {}
export type BlockFillSubmitPayload = z.infer<typeof BlockFillSubmitSchema>;
