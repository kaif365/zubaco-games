import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { GameType } from '../../../generated/prisma/enums';

export const GameTypeSchema = z.enum(Object.values(GameType) as [GameType, ...GameType[]]);

export const LanguageSchema = z.enum(['EN', 'HI']);

const ContentPointSchema = z.object({
    title: z.string().trim().optional(),
    description: z.string().trim().optional(),
});

const ContentPageSchema = z.object({
    visible_in_app: z.boolean().optional(),
    title: z.string().trim().optional(),
    description: z.string().trim().optional(),
    point_type: z.enum(['ORDERED', 'UNORDERED']).optional(),
    points: z.array(ContentPointSchema).optional(),
});

const GameContentDataSchema = z.object({
    pages: z.array(ContentPageSchema).optional(),
    play_now_button: z.string().trim().optional(),
    learn_how_to_play: z.string().trim().optional(),
});

export const ContentSectionSchema = z.object({
    stage_id: z.uuid().optional(),
    language: LanguageSchema,
    content: GameContentDataSchema,
});

export const MemoryCardMatchingConfigSchema = z.object({
    game_time_limit_seconds: z.number().int().positive().optional(),
});

export const SlidingPuzzleConfigSchema = z.object({
    display_time: z.number().int().positive().optional(),
});

export const GameConfigSchema = z.union([
    MemoryCardMatchingConfigSchema,
    SlidingPuzzleConfigSchema,
    z.record(z.string(), z.unknown()), // permissive fallback for future games
]);

const CreateGameSchema = z
    .object({
        name: z.string().trim().min(1).max(100),
        game_type: GameTypeSchema,

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

        // Content sections
        content_sections: z.array(ContentSectionSchema).optional(),
    })
    .superRefine((data, ctx) => {
        const d = data as Record<string, unknown>;
        const reject = (field: string) =>
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [field],
                message: `Field '${field}' is not valid for game_type '${data.game_type}'`,
            });

        if (data.game_type !== 'SEQUENCE_RECALL') {
            for (const f of [
                'cell_count',
                'min_sequence',
                'max_sequence',
                'demo_min_sequence',
                'demo_max_sequence',
                'flash_delay',
                'level_delay',
                'bonus_time_ratio',
                'score_per_click',
                'wrong_move_handling',
            ]) {
                if (d[f] !== undefined) {
                    reject(f);
                }
            }
        }
        if (data.game_type !== 'BLOCK_FILL') {
            for (const f of ['total_actual_rounds', 'total_demo_rounds']) {
                if (d[f] !== undefined) {
                    reject(f);
                }
            }
        }
        if (data.game_type !== 'BLOCK_FILL' && data.game_type !== 'INFINITY_LOOP') {
            if (d['active_level_id'] !== undefined) {
                reject('active_level_id');
            }
        }
        if (data.game_type !== 'INFINITY_LOOP') {
            for (const f of [
                'il_title',
                'il_description',
                'il_background_sound_url',
                'il_tap_sound_url',
            ]) {
                if (d[f] !== undefined) {
                    reject(f);
                }
            }
        }
        if (data.game_type !== 'MEMORY_CARD_MATCHING') {
            for (const f of ['preview_duration_seconds', 'mismatch_display_duration_seconds']) {
                if (d[f] !== undefined) {
                    reject(f);
                }
            }
        }
        if (data.game_type !== 'MEMORY_CARD_MATCHING' && data.game_type !== 'SLIDING_PUZZLE') {
            if (d['game_config'] !== undefined) {
                reject('game_config');
            }
        }
    });

export class CreateGameDto extends createZodDto(CreateGameSchema) {}
export type CreateGamePayload = z.infer<typeof CreateGameSchema>;
