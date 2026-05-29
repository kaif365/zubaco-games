import { uuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateStageSchema = z
    .object({
        stage_number: z.number().int().positive().optional(),
        stage_name: z.string().trim().min(1).optional(),
        gameIds: uuidListSchema.optional(),
    })
    .refine(
        (payload) =>
            payload.stage_number !== undefined ||
            payload.stage_name !== undefined ||
            payload.gameIds !== undefined,
        {
            message: 'At least one field must be provided',
        },
    );

export class UpdateStageDto extends createZodDto(UpdateStageSchema) {}
export type UpdateStagePayload = z.infer<typeof UpdateStageSchema>;
