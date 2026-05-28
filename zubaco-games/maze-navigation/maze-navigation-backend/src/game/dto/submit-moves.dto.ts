import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const MazeMoveSchema = z.object({
  direction: z.enum(["up", "down", "left", "right"]),
  movedAt: z.string().datetime(),
  moveId: z.string().uuid(),
});

export const SubmitMovesSchema = z.object({
  moves: z.array(MazeMoveSchema).min(1),
});

export class SubmitMovesDto extends createZodDto(SubmitMovesSchema) {}
