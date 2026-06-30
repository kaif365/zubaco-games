import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateBannerSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  image_url: z.string().url().max(1000),
  action_url: z.string().url().max(1000),
  active: z.boolean(),
  priority: z.coerce.number().int().min(0),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
});

const UpdateBannerSchema = CreateBannerSchema.partial();

export class CreateBannerDto extends createZodDto(CreateBannerSchema) {}
export class UpdateBannerDto extends createZodDto(UpdateBannerSchema) {}
export type CreateBannerPayload = z.infer<typeof CreateBannerSchema>;
export type UpdateBannerPayload = z.infer<typeof UpdateBannerSchema>;
