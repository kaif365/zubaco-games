import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const StartGameSchema = z.object({
  clientSeed: z.string().min(1).max(256).optional(),
  level: z.number().int().min(1).max(10).optional(),
});

export class StartGameDto extends createZodDto(StartGameSchema) {}
