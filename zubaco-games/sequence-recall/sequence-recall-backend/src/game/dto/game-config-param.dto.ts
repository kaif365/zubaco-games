import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GameConfigParamSchema = z.object({
    stageId: z.string().trim().min(1, 'stageId is required'),
});

export class GameConfigParamDto extends createZodDto(GameConfigParamSchema) {}
export type GameConfigParamPayload = z.infer<typeof GameConfigParamSchema>;
