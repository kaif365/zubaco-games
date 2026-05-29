import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateMazeConfigSchema = z.object({
  levelId: z.string().uuid(),
  rows: z
    .number()
    .int()
    .min(5)
    .max(101)
    .refine((v) => v % 2 === 1, {
      message: "rows must be an odd number",
    }),
  cols: z
    .number()
    .int()
    .min(5)
    .max(101)
    .refine((v) => v % 2 === 1, {
      message: "cols must be an odd number",
    }),
});

export class CreateMazeConfigDto extends createZodDto(CreateMazeConfigSchema) {}

export const UpdateMazeConfigSchema = z.object({
  rows: z
    .number()
    .int()
    .min(5)
    .max(101)
    .refine((v) => v % 2 === 1, { message: "rows must be an odd number" })
    .optional(),
  cols: z
    .number()
    .int()
    .min(5)
    .max(101)
    .refine((v) => v % 2 === 1, { message: "cols must be an odd number" })
    .optional(),
});

export class UpdateMazeConfigDto extends createZodDto(UpdateMazeConfigSchema) {}
