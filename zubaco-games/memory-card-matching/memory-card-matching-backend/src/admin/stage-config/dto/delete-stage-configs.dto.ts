import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const DeleteStageConfigsSchema = z.object({
  stageIds: z.array(z.string().min(1)).min(1),
});

export class DeleteStageConfigsDto extends createZodDto(
  DeleteStageConfigsSchema,
) {}
