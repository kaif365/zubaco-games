import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const MoveSchema = z.object({
  fromTube: z.number().int().min(0),
  toTube: z.number().int().min(0),
  color: z.string(),
  timestamp: z.number(),
});

const SubmitResultSchema = z.object({
  gameSessionId: z.string().uuid(),
  moves: z.array(MoveSchema).max(1000),
  clientScore: z.number().int().min(0),
  solved: z.boolean(),
});

export class SubmitResultDto extends createZodDto(SubmitResultSchema) {}
