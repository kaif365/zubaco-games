import { INT4_MAX } from "@common/constants";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdateDifficultySchema = z.object({
  difficultyId: z.string().uuid(),
  name: z.string().min(1).max(100),
  difficultyScore: z.number().int().min(0).max(INT4_MAX),
});

export class UpdateDifficultyDto extends createZodDto(UpdateDifficultySchema) {}
