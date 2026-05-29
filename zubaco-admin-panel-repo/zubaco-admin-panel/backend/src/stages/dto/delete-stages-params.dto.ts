import { csvUuidListSchema } from '@common/utils/id-list.util';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DeleteStagesParamsSchema = z.object({
    stageId: csvUuidListSchema,
});

export class DeleteStagesParamsDto extends createZodDto(DeleteStagesParamsSchema) {}
export type DeleteStagesParams = z.infer<typeof DeleteStagesParamsSchema>;
