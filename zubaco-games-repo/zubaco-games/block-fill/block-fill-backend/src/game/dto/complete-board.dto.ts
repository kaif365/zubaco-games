import { createZodDto } from 'nestjs-zod';

import { SaveProgressSchema } from './save-progress.dto';

export const CompleteBoardSchema = SaveProgressSchema;

export class CompleteBoardDto extends createZodDto(CompleteBoardSchema) {}
