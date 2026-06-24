import { uuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateStageSchema = z.object({
    stage_number: z.number().int().positive(),
    stage_name: z.string().trim().min(1),
    gameIds: uuidListSchema.optional(),
});

export class CreateStageDto extends createZodDto(CreateStageSchema) {}
export type CreateStagePayload = z.infer<typeof CreateStageSchema>;
