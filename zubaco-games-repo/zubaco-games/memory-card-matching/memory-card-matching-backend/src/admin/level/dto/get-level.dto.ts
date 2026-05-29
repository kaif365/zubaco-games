import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const GetLevelSchema = z.object({
  levelId: z.string().uuid(),
});

export class GetLevelDto extends createZodDto(GetLevelSchema) {}
