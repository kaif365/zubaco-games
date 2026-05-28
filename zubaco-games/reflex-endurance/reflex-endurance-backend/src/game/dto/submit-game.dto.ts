import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
const TapSchema = z.object({ circleId: z.number().int(), timestamp: z.number(), correct: z.boolean() });
export class SubmitGameDto extends createZodDto(z.object({ gameSessionId: z.string().uuid(), taps: z.array(TapSchema).max(1000), clientScore: z.number().int().min(0) })) {}
