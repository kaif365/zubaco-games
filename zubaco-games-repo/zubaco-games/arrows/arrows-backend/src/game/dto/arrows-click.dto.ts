import { z } from 'zod';

export const ArrowsClickSchema = z.object({
    x: z.number().int().min(0).max(999),
    y: z.number().int().min(0).max(999),
});

export type ArrowsClickPayload = z.infer<typeof ArrowsClickSchema>;
