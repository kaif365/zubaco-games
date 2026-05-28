import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const PlacementSchema = z.object({
  objectId: z.string(),
  placedCellIndex: z.number().int().min(-1),
  correctCellIndex: z.number().int().min(0),
  isCorrect: z.boolean(),
});

const SubmitResultSchema = z.object({
  gameSessionId: z.string().uuid(),
  placements: z.array(PlacementSchema).max(50),
  clientScore: z.number().int().min(0),
});

export class SubmitResultDto extends createZodDto(SubmitResultSchema) {}
