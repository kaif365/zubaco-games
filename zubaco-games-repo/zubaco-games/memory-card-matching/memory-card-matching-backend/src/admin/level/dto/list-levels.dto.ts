import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { CardContentTypeSchema } from "./shared";

export const ListLevelsSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  difficultyId: z.string().uuid().optional(),
  cardContentType: CardContentTypeSchema.optional(),
  gridRows: z.coerce.number().int().min(2).optional(),
  gridColumns: z.coerce.number().int().min(2).optional(),
});

export class ListLevelsDto extends createZodDto(ListLevelsSchema) {}
