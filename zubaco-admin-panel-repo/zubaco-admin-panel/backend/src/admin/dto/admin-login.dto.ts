import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AdminLoginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1),
});

export class AdminLoginDto extends createZodDto(AdminLoginSchema) {}
export type AdminLoginPayload = z.infer<typeof AdminLoginSchema>;
