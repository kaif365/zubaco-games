import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const GetDemoSchema = z.object({
    stageId: z.string().min(1),
});

export class GetDemoDto extends createZodDto(GetDemoSchema) {}
