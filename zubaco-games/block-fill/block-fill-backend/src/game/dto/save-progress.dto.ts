import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GAME_CONFIGS } from '../../common/constants';

const PathPointSchema = z.object({
    row: z.number().int().min(0).max(GAME_CONFIGS.GRID_MAX_INDEX),
    col: z.number().int().min(0).max(GAME_CONFIGS.GRID_MAX_INDEX),
});

const SavedPathSchema = z.object({
    moveId: z.string().uuid(),
    timeStamp: z.string().datetime({ offset: true }),
    color: z.string().min(1).max(64),
    path: z.array(PathPointSchema).max(GAME_CONFIGS.MAX_PATH_POINTS),
});

export const SaveProgressSchema = z.object({
    sessionId: z.string().uuid(),
    board: z.object({
        sessionBoardId: z.string().uuid().optional(),
        version: z.number().int().min(0).optional(),
        paths: z.array(SavedPathSchema).max(GAME_CONFIGS.MAX_PATHS_PER_BOARD),
    }),
});

export class SaveProgressDto extends createZodDto(SaveProgressSchema) {}
