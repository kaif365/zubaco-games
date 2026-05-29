import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const EndGameSchema = z.object({
    sessionId: z.string().uuid(),
});

export class EndGameDto extends createZodDto(EndGameSchema) {}
