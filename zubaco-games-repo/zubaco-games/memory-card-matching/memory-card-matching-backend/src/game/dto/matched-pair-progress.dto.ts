import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const MatchedPairProgressSchema = z
  .object({
    pairId: z.string().min(1),
    timestamp: z.string().datetime({ offset: true }),
  })
  .strict();

export class MatchedPairProgressDto extends createZodDto(
  MatchedPairProgressSchema,
) {}
