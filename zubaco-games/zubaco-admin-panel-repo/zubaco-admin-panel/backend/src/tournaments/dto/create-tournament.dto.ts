import { uuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'DEACTIVATE']);

const CreateTournamentSchema = z
    .object({
        name: z.string().trim().min(1).max(100),
        start_date: z.iso.datetime().optional(),
        end_date: z.iso.datetime().optional(),
        status: StatusSchema.optional(),
        stageIds: uuidListSchema.optional(),
    })
    .refine(
        (data) => {
            if (data.start_date && data.end_date) {
                return new Date(data.end_date) >= new Date(data.start_date);
            }
            return true;
        },
        { message: 'end_date must be on or after start_date' },
    );

export class CreateTournamentDto extends createZodDto(CreateTournamentSchema) {}
export type CreateTournamentPayload = z.infer<typeof CreateTournamentSchema>;
