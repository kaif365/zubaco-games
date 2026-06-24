import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const StartSessionSchema = z.object({
    stageId: z.string().min(1),
    /** 1-based level number (maps to StageLevelConfig order). When provided, only boards from that level are served. */
    level: z.number().int().min(1).max(10).optional(),
    /** When true, marks this session as a daily challenge. */
    isDaily: z.boolean().optional(),
});

export class StartSessionDto extends createZodDto(StartSessionSchema) {}
