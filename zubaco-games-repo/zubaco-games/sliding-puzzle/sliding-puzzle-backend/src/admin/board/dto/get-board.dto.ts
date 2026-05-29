import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const GetBoardSchema = z.object({
    boardId: z.string().uuid(),
});

export class GetBoardDto extends createZodDto(GetBoardSchema) {}
