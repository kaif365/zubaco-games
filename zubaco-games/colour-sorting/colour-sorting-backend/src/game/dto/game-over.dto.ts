import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GameOverSchema = z.object({
  gameSessionId: z.string().uuid(),
  reason: z.string().max(200),
});

export class GameOverDto extends createZodDto(GameOverSchema) {}
