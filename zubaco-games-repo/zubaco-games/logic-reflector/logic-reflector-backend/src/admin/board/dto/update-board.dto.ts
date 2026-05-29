import { BLOCK_TYPE } from "@common/constants";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const BLOCK_TYPE_VALUES = Object.values(BLOCK_TYPE) as [number, ...number[]];

const CellSchema = z.object({
  row: z.number().int().min(0).max(999),
  col: z.number().int().min(0).max(999),
  type: z.number().int().min(0),
  fixed: z.boolean().default(true),
  direction: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  radius: z.number().optional(),
});

const InitialBlockSchema = z.object({
  row: z.number().int().min(0).max(999),
  col: z.number().int().min(0).max(999),
  type: z
    .number()
    .int()
    .refine((v) => BLOCK_TYPE_VALUES.includes(v), {
      message: "Invalid type",
    }),
  seeded: z.boolean().default(false),
});

export const UpdateBoardSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(100),
  gridSize: z.object({
    x: z.number().int().min(1).max(100),
    y: z.number().int().min(1).max(100),
  }),
  cells: z.array(CellSchema).min(1),
  initialBlocks: z.array(InitialBlockSchema).default([]),
});

export class UpdateBoardDto extends createZodDto(UpdateBoardSchema) {}
