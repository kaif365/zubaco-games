import { GAME_CONFIGS } from "@common/constants";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const MoveSchema = z
  .object({
    id: z.string().min(1),
    clickedAt: z.string().datetime(),
    moveId: z.string().uuid(),
  })
  .strict();

export const SaveProgressSchema = z
  .object({
    moves: z.array(MoveSchema).min(1).max(GAME_CONFIGS.SAVE_PROGRESS_MAX_BATCH),
  })
  .strict();

export class SaveProgressDto extends createZodDto(SaveProgressSchema) {}
