import { uuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AddStageToTournamentSchema = z.object({
    tournament_id: z.string().uuid(),
    stage_ids: uuidListSchema,
});

export class AddStageToTournamentDto extends createZodDto(AddStageToTournamentSchema) {}
export type AddStageToTournamentPayload = z.infer<typeof AddStageToTournamentSchema>;
