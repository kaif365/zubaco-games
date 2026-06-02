import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateDevSessionSchema = z.object({
    stageId: z.string().min(1, 'stageId is required'),
});

export class CreateDevSessionDto extends createZodDto(CreateDevSessionSchema) {}
