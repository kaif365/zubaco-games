import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ContentSectionSchema, GameConfigSchema } from './create-game.dto';

const StatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'DEACTIVATE']);

const UpdateGameSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        status: StatusSchema.optional(),

        // Common
        time_limit: z.number().int().positive().optional(),
        enable_demo: z.boolean().optional(),

        // Sequence Recall
        cell_count: z.number().int().positive().optional(),
        min_sequence: z.number().int().positive().optional(),
        max_sequence: z.number().int().positive().optional(),
        demo_min_sequence: z.number().int().nonnegative().optional(),
        demo_max_sequence: z.number().int().nonnegative().optional(),
        flash_delay: z.number().int().nonnegative().optional(),
        level_delay: z.number().int().nonnegative().optional(),
        bonus_time_ratio: z.number().positive().optional(),
        score_per_click: z.number().int().positive().optional(),
        wrong_move_handling: z.number().int().min(1).max(4).optional(),

        // Block Fill
        total_actual_rounds: z.number().int().positive().optional(),
        total_demo_rounds: z.number().int().nonnegative().optional(),

        // Shared — Block Fill + Infinity Loop
        active_level_id: z.string().optional(),

        // Infinity Loop
        il_title: z.string().trim().min(1).max(200).optional(),
        il_description: z.string().trim().optional(),
        il_background_sound_url: z.url().optional(),
        il_tap_sound_url: z.url().optional(),

        has_pool: z.boolean().optional(),
        meta_data_visible: z.boolean().optional(),

        // Memory Card Matching — dedicated columns
        preview_duration_seconds: z.number().int().positive().optional(),
        mismatch_display_duration_seconds: z.number().int().positive().optional(),

        // Extensible config for new games (MCM, SP)
        game_config: GameConfigSchema.optional(),

        // Content sections — upserts by language
        content_sections: z.array(ContentSectionSchema).optional(),
    })
    .refine((payload) => Object.values(payload).some((v) => v !== undefined), {
        message: 'At least one field must be provided',
    });

export class UpdateGameDto extends createZodDto(UpdateGameSchema) {}
export type UpdateGamePayload = z.infer<typeof UpdateGameSchema>;
