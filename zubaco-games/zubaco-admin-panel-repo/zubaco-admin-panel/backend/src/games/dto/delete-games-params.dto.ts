import { csvUuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DeleteGamesParamsSchema = z.object({
    gameId: csvUuidListSchema,
});

export class DeleteGamesParamsDto extends createZodDto(DeleteGamesParamsSchema) {}
export type DeleteGamesParams = z.infer<typeof DeleteGamesParamsSchema>;
