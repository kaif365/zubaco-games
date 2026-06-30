import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().min(1).max(100),
        value: z.string().max(1000),
      }),
    )
    .min(1)
    .max(100),
});

export class UpdateSettingsDto extends createZodDto(UpdateSettingsSchema) {}
export type UpdateSettingsPayload = z.infer<typeof UpdateSettingsSchema>;
