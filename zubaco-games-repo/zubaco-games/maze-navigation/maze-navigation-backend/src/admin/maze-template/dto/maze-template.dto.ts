import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const MazeTemplateBaseSchema = z.object({
  levelId: z.string().uuid(),
  grid: z.array(z.array(z.number().int().min(0).max(1))), // 0=path, 1=wall
  rows: z.number().int().min(5).max(101),
  cols: z.number().int().min(5).max(101),
  startRow: z.number().int().min(0),
  startCol: z.number().int().min(0),
  endRow: z.number().int().min(0),
  endCol: z.number().int().min(0),
});

export const CreateMazeTemplateSchema = MazeTemplateBaseSchema.refine(
  (data) => {
    // Basic validation: check if grid matches rows/cols
    if (data.grid.length !== data.rows) return false;
    return data.grid.every((row) => row.length === data.cols);
  },
  {
    message: "Grid dimensions must match specified rows and cols",
  },
).refine(
  (data) => {
    // Check if start and end are within bounds
    const startInBounds =
      data.startRow < data.rows && data.startCol < data.cols;
    const endInBounds = data.endRow < data.rows && data.endCol < data.cols;
    return startInBounds && endInBounds;
  },
  {
    message: "Start and End coordinates must be within grid bounds",
  },
);

export class CreateMazeTemplateDto extends createZodDto(
  CreateMazeTemplateSchema,
) {}

export const UpdateMazeTemplateSchema = MazeTemplateBaseSchema.partial();

export class UpdateMazeTemplateDto extends createZodDto(
  UpdateMazeTemplateSchema,
) {}

export const QueryMazeTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export class QueryMazeTemplateDto extends createZodDto(
  QueryMazeTemplateSchema,
) {}

export const GenerateMazeTemplateSchema = z
  .object({
    levelId: z.string().uuid().optional(),
    rows: z.number().int().min(5).max(101).optional(),
    cols: z.number().int().min(5).max(101).optional(),
    seed: z.string().optional(),
    startRow: z.number().int().min(1).optional(),
    startCol: z.number().int().min(1).optional(),
    endRow: z.number().int().min(1).optional(),
    endCol: z.number().int().min(1).optional(),
  })
  .refine(
    (data) => {
      return data.levelId || (data.rows && data.cols);
    },
    {
      message: "Either levelId or both rows and cols must be provided",
    },
  );

export class GenerateMazeTemplateDto extends createZodDto(
  GenerateMazeTemplateSchema,
) {}
