import { csvUuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RemoveStageFromGamesParamsSchema = z.object({
    gameIds: csvUuidListSchema,
    stageId: z.string().uuid(),
});

export class RemoveStageFromGamesParamsDto extends createZodDto(RemoveStageFromGamesParamsSchema) {}
export type RemoveStageFromGamesParams = z.infer<typeof RemoveStageFromGamesParamsSchema>;
