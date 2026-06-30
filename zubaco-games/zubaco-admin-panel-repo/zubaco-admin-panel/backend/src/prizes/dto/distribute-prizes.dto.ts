import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PrizeDistributionSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  rank: z.coerce.number().int().positive(),
});

const DistributePrizesSchema = z.object({
  season_id: z.string().uuid(),
  distributions: z.array(PrizeDistributionSchema).min(1).max(1000),
});

export class DistributePrizesDto extends createZodDto(DistributePrizesSchema) {}
export type DistributePrizesPayload = z.infer<typeof DistributePrizesSchema>;
