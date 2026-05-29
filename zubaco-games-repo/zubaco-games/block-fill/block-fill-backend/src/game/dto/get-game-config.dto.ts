import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const GetGameConfigSchema = z.object({
    stageId: z.string().min(1),
});

export class GetGameConfigDto extends createZodDto(GetGameConfigSchema) {}
