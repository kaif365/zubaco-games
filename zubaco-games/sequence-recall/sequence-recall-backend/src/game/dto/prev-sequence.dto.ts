import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PrevSequenceSchema = z.object({
    stageId: z.string().trim().min(1, 'stageId is required'),
    current_demo_round: z.number().int().min(0, 'current_demo_round must be >= 0'),
    current_actual_round: z.number().int().min(0, 'current_actual_round must be >= 0'),
});

export class PrevSequenceDto extends createZodDto(PrevSequenceSchema) {}
export type PrevSequencePayload = z.infer<typeof PrevSequenceSchema>;
