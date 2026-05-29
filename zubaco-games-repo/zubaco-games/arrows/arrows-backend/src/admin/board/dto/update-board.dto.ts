import { STRING_TO_DIR } from '@common/constants';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DIRECTION_VALUES = Object.keys(STRING_TO_DIR) as [string, ...string[]];

const WaypointSchema = z.object({
    x: z.number().int().min(0).max(999),
    y: z.number().int().min(0).max(999),
});

const ArrowSchema = z.object({
    waypoints: z.array(WaypointSchema).min(1),
    headDirection: z.enum(DIRECTION_VALUES),
    color: z.number().int().min(0).max(0xffffff),
});

export const UpdateBoardSchema = z.object({
    boardId: z.string().uuid(),
    name: z.string().min(1).max(100),
    gridSize: z.object({
        x: z.number().int().min(1).max(100),
        y: z.number().int().min(1).max(100),
    }),
    arrows: z.array(ArrowSchema).min(1),
});

export class UpdateBoardDto extends createZodDto(UpdateBoardSchema) {}
