import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const WalletAdjustSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(500),
});

const BanUserSchema = z.object({
  reason: z.string().min(1).max(500),
});

const UpdateUserSchema = z
  .object({
    display_name: z.string().min(1).max(100).optional(),
    username: z.string().min(1).max(100).optional(),
    is_verified: z.boolean().optional(),
  })
  .strict();

export class WalletAdjustDto extends createZodDto(WalletAdjustSchema) {}
export class BanUserDto extends createZodDto(BanUserSchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
export type WalletAdjustPayload = z.infer<typeof WalletAdjustSchema>;
export type UpdateUserPayload = z.infer<typeof UpdateUserSchema>;
