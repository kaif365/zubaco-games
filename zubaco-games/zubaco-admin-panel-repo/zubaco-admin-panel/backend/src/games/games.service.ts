import { SORT_ORDER } from '@common/constants';
import type { ListQueryPayload } from '@common/dto/list-query.dto';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildPaginationMeta } from '@common/utils/pagination.util';
import { config } from '@config';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';

import type { InputJsonValue } from '../../generated/prisma/internal/prismaNamespace';
import { S3Service } from '../aws/s3.service';
import { GameConfigEventType } from '../aws/sns.enum';
import { SqsService } from '../aws/sqs.service';

import type { CreateGamePayload } from './dto/create-game.dto';
import type { RegisterAssetPayload, RequestAssetUploadPayload } from './dto/game-asset.dto';
import type { StageContentQueryPayload } from './dto/stage-content-query.dto';
import type { UpdateGamePayload } from './dto/update-game.dto';

@Injectable()
export class GamesService {
    private readonly logger = new Logger(GamesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly sqs: SqsService,
        private readonly s3: S3Service,
    ) {}

    async createGame(payload: CreateGamePayload) {
        const [existingByName, existingByType] = await Promise.all([
            this.prisma.game.findFirst({ where: { name: payload.name, deleted_at: null } }),
            this.prisma.game.findFirst({
                where: { game_type: payload.game_type, deleted_at: null },
            }),
        ]);

        if (existingByName) {
            throw new ConflictException('GAME_ALREADY_EXISTS');
        }
        if (existingByType) {
            throw new ConflictException('GAME_TYPE_ALREADY_EXISTS');
        }

        const { content_sections, game_config, ...gameData } = payload;

        const gameLevelSections = content_sections?.filter((s) => !s.stage_id) ?? [];
        const stageLevelSections = content_sections?.filter((s) => s.stage_id) ?? [];

        const gameContent = gameLevelSections.length
            ? Object.fromEntries(gameLevelSections.map((s) => [s.language, s.content]))
            : undefined;

        const game = await this.prisma.game.create({
            data: {
                ...gameData,
                ...(gameContent && { game_content: gameContent }),
                ...(game_config && { game_config: game_config as InputJsonValue }),
                ...(stageLevelSections.length && {
                    content_sections: {
                        create: stageLevelSections.map((s) => ({
                            stage_id: s.stage_id as string,
                            language: s.language,
                            content: s.content,
                        })),
                    },
                }),
            },
        });

        const result = await this.getGame(game.id);
        await this.publishGameEvent(result, GameConfigEventType.CREATED);
        return result;
    }

    async listGames(query: ListQueryPayload) {
        const { page, limit, search } = query;
        const where = {
            deleted_at: null,
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };

        const [total, games] = await Promise.all([
            this.prisma.game.count({ where }),
            this.prisma.game.findMany({
                where,
                include: {
                    game_stages: {
                        where: { stage: { deleted_at: null } },
                        include: { stage: true },
                        orderBy: { stage: { stage_number: SORT_ORDER.ASC } },
                    },
                },
                orderBy: { created_at: SORT_ORDER.DESC },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return {
            items: games.map((game) => this.withStages(game)),
            pagination: buildPaginationMeta({ page, limit, total }),
        };
    }

    async getGame(gameId: string, stageId?: string) {
        const game = await this.findGameOrThrow(gameId);
        const base = this.withStages(game);

        if (stageId) {
            const stageContent = await this.prisma.gameContent.findMany({
                where: { game_id: gameId, stage_id: stageId, deleted_at: null },
                orderBy: [{ language: SORT_ORDER.ASC }],
            });
            return { ...base, stage_content: stageContent };
        }

        const gameContent = (game.game_content ?? {}) as Record<string, unknown>;
        const stageContent = Object.entries(gameContent)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([language, content]) => ({ language, content }));

        return { ...base, stage_content: stageContent };
    }

    async updateGame(gameId: string, payload: UpdateGamePayload) {
        const existingGame = await this.prisma.game.findFirst({
            where: { id: gameId, deleted_at: null },
            select: { id: true, game_type: true },
        });

        if (!existingGame) {
            throw new NotFoundException('GAME_NOT_FOUND');
        }

        const fields = payload as Record<string, unknown>;
        const rejectFields = (allowedTypes: string[], names: string[]) => {
            if (!allowedTypes.includes(existingGame.game_type)) {
                const invalid = names.filter((f) => fields[f] !== undefined);
                if (invalid.length > 0) {
                    throw new BadRequestException(
                        `Fields [${invalid.join(', ')}] are not valid for game_type '${existingGame.game_type}'`,
                    );
                }
            }
        };

        rejectFields(
            ['SEQUENCE_RECALL'],
            [
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
            ],
        );
        rejectFields(['BLOCK_FILL'], ['total_actual_rounds', 'total_demo_rounds']);
        rejectFields(['BLOCK_FILL', 'INFINITY_LOOP'], ['active_level_id']);
        rejectFields(
            ['INFINITY_LOOP'],
            ['il_title', 'il_description', 'il_background_sound_url', 'il_tap_sound_url'],
        );
        rejectFields(
            ['MEMORY_CARD_MATCHING'],
            ['preview_duration_seconds', 'mismatch_display_duration_seconds'],
        );
        rejectFields(['MEMORY_CARD_MATCHING', 'SLIDING_PUZZLE'], ['game_config']);

        if (payload.name) {
            const existing = await this.prisma.game.findFirst({
                where: { name: payload.name, deleted_at: null },
                select: { id: true },
            });

            if (existing && existing.id !== gameId) {
                throw new ConflictException('GAME_ALREADY_EXISTS');
            }
        }

        const { content_sections, game_config, ...gameData } = payload;

        const gameLevelSections = content_sections?.filter((s) => !s.stage_id) ?? [];
        const stageLevelSections = content_sections?.filter((s) => s.stage_id) ?? [];

        // Build game_content update: merge incoming languages into existing JSONB map
        let gameContentUpdate: Record<string, unknown> = {};
        let gameConfigUpdate: Record<string, unknown> = {};

        const needsExistingFetch = gameLevelSections.length > 0 || game_config !== undefined;
        if (needsExistingFetch) {
            const existing = await this.prisma.game.findFirst({
                where: { id: gameId },
                select: { game_content: true, game_config: true },
            });

            if (gameLevelSections.length > 0) {
                const currentContent = (existing?.game_content as Record<string, unknown>) ?? {};
                for (const s of gameLevelSections) {
                    currentContent[s.language] = s.content;
                }
                gameContentUpdate = { game_content: currentContent };
            }

            if (game_config !== undefined) {
                const currentConfig = (existing?.game_config as Record<string, unknown>) ?? {};
                gameConfigUpdate = {
                    game_config: { ...currentConfig, ...game_config } as InputJsonValue,
                };
            }
        }

        const updatedGame = await this.prisma.game.update({
            where: { id: gameId },
            data: { ...gameData, ...gameContentUpdate, ...gameConfigUpdate },
            include: {
                game_stages: {
                    where: { stage: { deleted_at: null } },
                    include: { stage: true },
                    orderBy: { stage: { stage_number: SORT_ORDER.ASC } },
                },
            },
        });

        if (stageLevelSections.length > 0) {
            const incomingKeys = new Set(
                stageLevelSections.map((s) => `${s.stage_id}__${s.language}`),
            );

            const existingStageContent = await this.prisma.gameContent.findMany({
                where: { game_id: gameId, deleted_at: null },
                select: { id: true, stage_id: true, language: true },
            });

            const toDelete = existingStageContent
                .filter((e) => !incomingKeys.has(`${e.stage_id}__${e.language}`))
                .map((e) => e.id);

            if (toDelete.length > 0) {
                await this.prisma.gameContent.updateMany({
                    where: { id: { in: toDelete } },
                    data: { deleted_at: new Date() },
                });
            }

            await Promise.all(
                stageLevelSections.map(async (section) => {
                    const existing = await this.prisma.gameContent.findFirst({
                        where: {
                            game_id: gameId,
                            stage_id: section.stage_id as string,
                            language: section.language,
                        },
                    });

                    if (existing) {
                        await this.prisma.gameContent.update({
                            where: { id: existing.id },
                            data: { content: section.content, deleted_at: null },
                        });
                    } else {
                        await this.prisma.gameContent.create({
                            data: {
                                game_id: gameId,
                                stage_id: section.stage_id as string,
                                language: section.language,
                                content: section.content,
                            },
                        });
                    }
                }),
            );
        }

        const gameContent = (updatedGame.game_content ?? {}) as Record<string, unknown>;
        const stageContent = Object.entries(gameContent)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([language, content]) => ({ language, content }));

        const result = { ...this.withStages(updatedGame), stage_content: stageContent };
        await this.publishGameEvent(result, GameConfigEventType.UPDATED);
        return result;
    }

    async getStageContent(query: StageContentQueryPayload) {
        const game = await this.prisma.game.findUnique({
            where: { game_type: query.game_type },
            select: { id: true, created_at: true, deleted_at: true },
        });

        if (!game || game.deleted_at !== null) {
            throw new NotFoundException('GAME_NOT_FOUND');
        }

        const [content_section, gamesAhead] = await Promise.all([
            this.prisma.gameContent.findFirst({
                where: {
                    game_id: game.id,
                    stage_id: query.stage_id,
                    language: query.lang,
                    deleted_at: null,
                },
            }),
            this.prisma.game.count({
                where: { deleted_at: null, created_at: { lt: game.created_at } },
            }),
        ]);

        this.logger.log({
            game_id: game.id,
            stage_id: query.stage_id,
            language: query.lang,
            deleted_at: null,
        });

        this.logger.log(content_section);
        this.logger.log('CONFIGURATION');
        if (!content_section) {
            throw new NotFoundException('CONTENT_NOT_FOUND');
        }

        const content = content_section.content as Record<string, unknown>;
        const filteredContent = {
            ...content_section,
            content: {
                ...content,
                pages: Array.isArray(content?.pages)
                    ? (content.pages as Record<string, unknown>[]).filter(
                          (page) => page.visible_in_app !== false,
                      )
                    : content?.pages,
            },
        };

        return {
            game_id: game.id,
            stage_id: query.stage_id,
            game_index: gamesAhead + 1,
            content_section: filteredContent,
        };
    }

    async deleteGame(gameIds: string[]) {
        await this.ensureGameIdsExist(gameIds);

        const games = await this.prisma.game.findMany({
            where: { id: { in: gameIds }, deleted_at: null },
        });

        const result = await this.prisma.game.updateMany({
            where: { id: { in: gameIds } },
            data: { deleted_at: new Date() },
        });

        await Promise.all(games.map((g) => this.publishGameEvent(g, GameConfigEventType.DELETED)));

        return result;
    }

    async listStages(gameId: string) {
        await this.ensureGameExists(gameId);

        const gameStages = await this.prisma.gameStage.findMany({
            where: { game_id: gameId },
            include: { stage: true },
            orderBy: {
                stage: { stage_number: SORT_ORDER.ASC },
            },
        });

        return gameStages.map((gameStage) => gameStage.stage);
    }

    async removeStage(gameIds: string[], stageId: string) {
        await this.ensureGameIdsExist(gameIds);
        await this.ensureStageExists(stageId);

        const gameStages = await this.prisma.gameStage.findMany({
            where: {
                game_id: { in: gameIds },
                stage_id: stageId,
            },
            include: {
                stage: true,
                game: {
                    include: {
                        content_sections: {
                            where: { deleted_at: null },
                            orderBy: { language: SORT_ORDER.ASC },
                        },
                    },
                },
            },
        });

        if (gameStages.length !== gameIds.length) {
            throw new NotFoundException('STAGE_NOT_FOUND');
        }

        await this.prisma.gameStage.deleteMany({
            where: {
                game_id: { in: gameIds },
                stage_id: stageId,
            },
        });

        await this.prisma.gameContent.deleteMany({
            where: { game_id: { in: gameIds }, stage_id: stageId },
        });

        const stageNumber = gameStages[0].stage.stage_number;
        await Promise.all(
            gameStages
                .filter((gs) => config.aws.sqs.gameQueueUrls[gs.game.game_type])
                .map((gs) =>
                    this.sqs.sendMessage({
                        queueUrl: config.aws.sqs.gameQueueUrls[gs.game.game_type],
                        payload: {
                            stage_id: stageId,
                            stage_number: stageNumber,
                            game_id: gs.game_id,
                            game_type: gs.game.game_type,
                            action: GameConfigEventType.STAGE_DETACHED,
                            occurred_at: new Date().toISOString(),
                            game_config: gs.game,
                        },
                        messageAttributes: {
                            event_type: {
                                DataType: 'String',
                                StringValue: GameConfigEventType.STAGE_DETACHED,
                            },
                        },
                    }),
                ),
        );

        return {
            game_ids: gameIds,
            stage: gameStages[0].stage,
        };
    }

    private async ensureGameExists(gameId: string) {
        const game = await this.prisma.game.findFirst({
            where: { id: gameId, deleted_at: null },
            select: { id: true },
        });

        if (!game) {
            throw new NotFoundException('GAME_NOT_FOUND');
        }
    }

    private async ensureStageExists(stageId: string) {
        const stage = await this.prisma.stage.findFirst({
            where: { id: stageId, deleted_at: null },
            select: { id: true },
        });

        if (!stage) {
            throw new NotFoundException('STAGE_NOT_FOUND');
        }
    }

    private async ensureGameIdsExist(gameIds: string[]) {
        const total = await this.prisma.game.count({
            where: { id: { in: gameIds }, deleted_at: null },
        });

        if (total !== gameIds.length) {
            throw new NotFoundException('GAME_NOT_FOUND');
        }
    }

    private async publishGameEvent(
        game: { id: string; game_type: string } & Record<string, unknown>,
        eventType: GameConfigEventType,
    ): Promise<void> {
        const queueUrl = config.aws.sqs.gameQueueUrls[game.game_type];
        if (!queueUrl) {
            return;
        }

        await this.sqs.sendMessage({
            queueUrl,
            payload: {
                game_id: game.id,
                game_type: game.game_type,
                action: eventType,
                occurred_at: new Date().toISOString(),
                game_config: game,
            },
            messageAttributes: {
                event_type: { DataType: 'String', StringValue: eventType },
            },
        });
    }

    // ─── GAME ASSET IMAGES (S3) ─────────────────────────────────

    /**
     * Issue a presigned URL so an admin can upload a spot-the-difference or
     * sliding-puzzle image straight to S3 (the API never proxies the bytes).
     */
    async requestAssetUpload(gameId: string, payload: RequestAssetUploadPayload) {
        await this.findGameOrThrow(gameId);
        return this.s3.createPresignedUpload({
            category: payload.category,
            gameId,
            contentType: payload.content_type,
            contentLength: payload.content_length,
        });
    }

    /**
     * Register an uploaded asset against the game's config. Assets are grouped
     * by category under `game_config.assets` and carry the public URL so the
     * game frontends and Base Platform can render them.
     */
    async registerAsset(gameId: string, payload: RegisterAssetPayload) {
        const game = await this.prisma.game.findFirst({
            where: { id: gameId, deleted_at: null },
            select: { game_config: true },
        });
        if (!game) throw new NotFoundException('GAME_NOT_FOUND');

        const currentConfig = (game.game_config as Record<string, unknown>) ?? {};
        const assets = (currentConfig.assets as Record<string, unknown[]>) ?? {};
        const categoryAssets = Array.isArray(assets[payload.category])
            ? (assets[payload.category] as Record<string, unknown>[])
            : [];

        const asset = {
            key: payload.key,
            url: this.s3.publicUrl(payload.key),
            label: payload.label ?? null,
            stage_id: payload.stage_id ?? null,
            uploaded_at: new Date().toISOString(),
        };

        const nextConfig = {
            ...currentConfig,
            assets: { ...assets, [payload.category]: [...categoryAssets, asset] },
        } as InputJsonValue;

        await this.prisma.game.update({
            where: { id: gameId },
            data: { game_config: nextConfig },
        });

        return asset;
    }

    /** Remove a previously registered asset from both S3 and the game config. */
    async deleteAsset(gameId: string, category: string, key: string) {
        const game = await this.prisma.game.findFirst({
            where: { id: gameId, deleted_at: null },
            select: { game_config: true },
        });
        if (!game) throw new NotFoundException('GAME_NOT_FOUND');

        const currentConfig = (game.game_config as Record<string, unknown>) ?? {};
        const assets = (currentConfig.assets as Record<string, Record<string, unknown>[]>) ?? {};
        const categoryAssets = Array.isArray(assets[category]) ? assets[category] : [];
        const filtered = categoryAssets.filter((a) => a.key !== key);

        if (filtered.length === categoryAssets.length) {
            throw new NotFoundException('ASSET_NOT_FOUND');
        }

        const nextConfig = {
            ...currentConfig,
            assets: { ...assets, [category]: filtered },
        } as InputJsonValue;

        await this.prisma.game.update({
            where: { id: gameId },
            data: { game_config: nextConfig },
        });
        await this.s3.deleteObject(key);

        return { deleted: true, key };
    }

    private async findGameOrThrow(gameId: string) {
        const game = await this.prisma.game.findFirst({
            where: { id: gameId, deleted_at: null },
            include: {
                game_stages: {
                    where: { stage: { deleted_at: null } },
                    include: { stage: true },
                    orderBy: { stage: { stage_number: SORT_ORDER.ASC } },
                },
            },
        });

        if (!game) {
            throw new NotFoundException('GAME_NOT_FOUND');
        }

        return game;
    }

    private withStages<
        T extends {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            game_stages: Array<{ stage: unknown }>;
            game_content?: unknown;
        },
    >(game: T) {
        const { game_stages, ...rest } = game;

        const gameData = Object.fromEntries(
            Object.entries(rest as Record<string, unknown>).filter(([k]) => k !== 'game_content'),
        ) as Omit<T, 'game_stages' | 'game_content'>;

        return {
            ...gameData,
            stages: game_stages.map((gameStage) => gameStage.stage),
            meta_data: {
                game_id: game.id,
                status: game.status,
                created_at: game.created_at,
                updated_at: game.updated_at,
            },
        };
    }
}
