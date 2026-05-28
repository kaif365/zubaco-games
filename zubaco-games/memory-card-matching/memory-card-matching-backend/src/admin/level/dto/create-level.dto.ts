import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { CardContentTypeSchema, LevelContentConfigSchema } from "./shared";

export const CreateLevelSchema = z.object({
  difficultyId: z.string().uuid(),
  name: z.string().min(1).max(100),
  gridRows: z.number().int().min(2),
  gridColumns: z.number().int().min(2),
  cardContentType: CardContentTypeSchema,
  previewDurationSeconds: z.number().int().min(0),
  mismatchDisplayDurationSeconds: z.number().int().min(0),
  contentConfig: LevelContentConfigSchema,
});

export class CreateLevelDto extends createZodDto(CreateLevelSchema) {}
