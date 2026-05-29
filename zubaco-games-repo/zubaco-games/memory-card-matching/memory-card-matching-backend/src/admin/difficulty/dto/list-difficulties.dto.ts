import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ListDifficultiesSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
});

export class ListDifficultiesDto extends createZodDto(ListDifficultiesSchema) {}
