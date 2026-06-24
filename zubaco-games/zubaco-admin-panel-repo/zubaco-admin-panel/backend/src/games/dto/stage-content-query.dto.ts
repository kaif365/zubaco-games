import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { GameTypeSchema, LanguageSchema } from './create-game.dto';

const StageContentQuerySchema = z.object({
    stage_id: z.uuid(),
    game_type: GameTypeSchema,
    lang: LanguageSchema,
});

export class StageContentQueryDto extends createZodDto(StageContentQuerySchema) {}
export type StageContentQueryPayload = z.infer<typeof StageContentQuerySchema>;
