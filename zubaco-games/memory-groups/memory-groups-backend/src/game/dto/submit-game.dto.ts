import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
const SubmitSchema = z.object({ gameSessionId: z.string().uuid(), playerGroups: z.array(z.array(z.string()).length(3)).max(3), clientScore: z.number().int().min(0) });
export class SubmitGameDto extends createZodDto(SubmitSchema) {}
