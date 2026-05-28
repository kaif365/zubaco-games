import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdateLevelSchema = z.object({
  levelId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export class UpdateLevelDto extends createZodDto(UpdateLevelSchema) {}
