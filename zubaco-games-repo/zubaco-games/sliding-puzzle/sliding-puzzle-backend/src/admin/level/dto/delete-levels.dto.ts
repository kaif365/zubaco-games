import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const DeleteLevelsSchema = z.object({
    levelIds: z.array(z.string().uuid()).min(1),
});

export class DeleteLevelsDto extends createZodDto(DeleteLevelsSchema) {}
