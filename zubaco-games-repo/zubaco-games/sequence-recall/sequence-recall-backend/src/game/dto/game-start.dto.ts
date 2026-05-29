import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// game:start takes no client payload — stage is hardcoded server-side
// since this is a dedicated microservice for Sequence Recall (Stage 1)
const GameStartSchema = z.object({});

export class GameStartDto extends createZodDto(GameStartSchema) {}
export type GameStartPayload = z.infer<typeof GameStartSchema>;
