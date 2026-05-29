import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GameOverSchema = z.object({
  gameSessionId: z.string().uuid(),
  reason: z.enum(['timeout', 'user_quit', 'error']),
});

export class GameOverDto extends createZodDto(GameOverSchema) {}
