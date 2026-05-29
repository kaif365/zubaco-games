import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const DeleteBoardsSchema = z.object({
  boardIds: z.array(z.string().uuid()).min(1),
});

export class DeleteBoardsDto extends createZodDto(DeleteBoardsSchema) {}
