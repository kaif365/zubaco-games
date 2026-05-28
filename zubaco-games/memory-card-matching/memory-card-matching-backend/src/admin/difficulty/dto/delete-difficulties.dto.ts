import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const DeleteDifficultiesSchema = z.object({
  difficultyIds: z.array(z.string().uuid()).min(1),
});

export class DeleteDifficultiesDto extends createZodDto(
  DeleteDifficultiesSchema,
) {}
