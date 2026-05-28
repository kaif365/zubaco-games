import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const NextSequenceSchema = z.object({
    stageId: z.string().trim().min(1, 'stageId is required'),
    current_demo_round: z
        .number()
        .int()
        .min(0, 'current_demo_round must be greater than or equal to 0'),
    current_actual_round: z
        .number()
        .int()
        .min(0, 'current_actual_round must be greater than or equal to 0'),
});

export class NextSequenceDto extends createZodDto(NextSequenceSchema) {}
export type NextSequencePayload = z.infer<typeof NextSequenceSchema>;
