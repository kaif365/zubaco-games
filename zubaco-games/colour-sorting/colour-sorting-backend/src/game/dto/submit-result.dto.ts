import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const MoveSchema = z.object({
  fromTube: z.number().int().min(0).max(64),
  toTube: z.number().int().min(0).max(64),
  color: z.string().min(1).max(24),
  timestamp: z.number().int().min(0),
});

const SubmitResultSchema = z.object({
  gameSessionId: z.string().uuid(),
  moves: z.array(MoveSchema).max(1000),
  clientScore: z.number().int().min(0).max(1_000_000),
  solved: z.boolean(),
});

export class SubmitResultDto extends createZodDto(SubmitResultSchema) {}
