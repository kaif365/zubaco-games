import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateLevelSchema = z.object({
  name: z.string().min(1).max(100),
});

export class CreateLevelDto extends createZodDto(CreateLevelSchema) {}

export const UpdateLevelSchema = CreateLevelSchema.partial();

export class UpdateLevelDto extends createZodDto(UpdateLevelSchema) {}
