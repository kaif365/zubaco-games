import { BLOCK_TYPE } from "@common/constants";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const BLOCK_TYPE_VALUES = Object.values(BLOCK_TYPE) as [number, ...number[]];

const MoveSchema = z.object({
  moveId: z.string().uuid(),
  blockId: z.string().uuid().nullable(), // InFlightBlock.id the user is moving; null for new placements
  row: z.number().int().min(0).max(999),
  col: z.number().int().min(0).max(999),
  blockType: z
    .number()
    .int()
    .refine(
      (v) =>
        BLOCK_TYPE_VALUES.includes(v as (typeof BLOCK_TYPE_VALUES)[number]),
      { message: "Invalid block type" },
    )
    .nullable(), // null = remove block
  placedAt: z.string().datetime(),
});

export const SubmitMovesSchema = z.object({
  moves: z.array(MoveSchema).min(1),
});

export class SubmitMovesDto extends createZodDto(SubmitMovesSchema) {}
