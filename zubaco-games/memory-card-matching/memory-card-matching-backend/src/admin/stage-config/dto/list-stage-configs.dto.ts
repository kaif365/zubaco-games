import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ListStageConfigsSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  stageId: z.string().trim().min(1).optional(),
});

export class ListStageConfigsDto extends createZodDto(ListStageConfigsSchema) {}
