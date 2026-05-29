import { uuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AddGameToStageSchema = z.object({
    stage_id: z.string().uuid(),
    game_ids: uuidListSchema,
});

export class AddGameToStageDto extends createZodDto(AddGameToStageSchema) {}
export type AddGameToStagePayload = z.infer<typeof AddGameToStageSchema>;
