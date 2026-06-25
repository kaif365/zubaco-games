import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Asset categories that support image uploads. */
export const AssetCategorySchema = z.enum(['spot-diff', 'sliding-puzzle']);

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'] as const;

const RequestAssetUploadSchema = z.object({
    category: AssetCategorySchema,
    content_type: z.enum(ALLOWED_CONTENT_TYPES),
    content_length: z.number().int().positive().max(10 * 1024 * 1024).optional(),
});

export class RequestAssetUploadDto extends createZodDto(RequestAssetUploadSchema) {}
export type RequestAssetUploadPayload = z.infer<typeof RequestAssetUploadSchema>;

const RegisterAssetSchema = z.object({
    category: AssetCategorySchema,
    key: z.string().min(1).max(512),
    label: z.string().max(120).optional(),
    /** Optional stage this asset belongs to. */
    stage_id: z.uuid().optional(),
});

export class RegisterAssetDto extends createZodDto(RegisterAssetSchema) {}
export type RegisterAssetPayload = z.infer<typeof RegisterAssetSchema>;
