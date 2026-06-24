import { uuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DeleteTournamentsSchema = z.object({
    tournamentIds: uuidListSchema,
});

export class DeleteTournamentsDto extends createZodDto(DeleteTournamentsSchema) {}
export type DeleteTournamentsPayload = z.infer<typeof DeleteTournamentsSchema>;
