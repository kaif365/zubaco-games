import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
const EdgeSchema = z.object({ from: z.number().int().min(0), to: z.number().int().min(0), timestamp: z.number() });
const SubmitSchema = z.object({ gameSessionId: z.string().uuid(), edges: z.array(EdgeSchema).max(100), clientScore: z.number().int().min(0) });
export class SubmitGameDto extends createZodDto(SubmitSchema) {}
