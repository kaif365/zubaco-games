import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ListStageConfigsSchema = z.object({
  stageId: z.string().min(1).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class ListStageConfigsDto extends createZodDto(ListStageConfigsSchema) {}
