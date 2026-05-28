import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PathPointSchema = z.object({
    row: z.number().int(),
    col: z.number().int(),
});

const SavedPathSchema = z.object({
    moveId: z.string().uuid(),
    timeStamp: z.string().datetime({ offset: true }),
    color: z.string().min(1),
    path: z.array(PathPointSchema),
});

export const SaveProgressSchema = z.object({
    sessionId: z.string().uuid(),
    board: z.object({
        sessionBoardId: z.string().uuid().optional(),
        version: z.number().int().min(0).optional(),
        paths: z.array(SavedPathSchema),
    }),
});

export class SaveProgressDto extends createZodDto(SaveProgressSchema) {}
