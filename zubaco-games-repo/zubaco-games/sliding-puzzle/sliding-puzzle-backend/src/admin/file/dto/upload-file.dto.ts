import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UploadFileSchema = z.object({
    // multipart fields beyond the file itself (none required for now)
});

export class UploadFileDto extends createZodDto(UploadFileSchema) {}
