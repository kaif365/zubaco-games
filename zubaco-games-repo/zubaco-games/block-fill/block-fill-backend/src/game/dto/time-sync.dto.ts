import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TimeSyncSchema = z.object({
    sessionId: z.string().uuid(),
});

export class TimeSyncDto extends createZodDto(TimeSyncSchema) {}
