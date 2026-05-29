import { csvUuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RemoveStagesFromTournamentParamsSchema = z.object({
    tournamentId: z.string().uuid(),
    stageIds: csvUuidListSchema,
});

export class RemoveStagesFromTournamentParamsDto extends createZodDto(
    RemoveStagesFromTournamentParamsSchema,
) {}
export type RemoveStagesFromTournamentParams = z.infer<
    typeof RemoveStagesFromTournamentParamsSchema
>;
