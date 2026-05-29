import { SORT_ORDER } from '@common/constants';
import type { ListQueryPayload } from '@common/dto/list-query.dto';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildPaginationMeta } from '@common/utils/pagination.util';
import { config } from '@config';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma';

import { GameConfigEventType } from '../aws/sns.enum';
import { SqsService } from '../aws/sqs.service';

import type { AddGameToStagePayload } from './dto/add-game-to-stage.dto';
import type { CreateStagePayload } from './dto/create-stage.dto';
import type { UpdateStagePayload } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly sqs: SqsService,
    ) {}

    private async publishStageGameEvents(
        stageId: string,
        stageNumber: number,
        gameIds: string[],
        eventType: GameConfigEventType,
    ): Promise<void> {
        if (!gameIds.length) {
            return;
        }

        const games = await this.prisma.game.findMany({
            where: { id: { in: gameIds } },
            include: {
                content_sections: {
                    where: { deleted_at: null },
                    orderBy: { language: SORT_ORDER.ASC },
                },
            },
        });

        await Promise.all(
            games
                .filter((g) => config.aws.sqs.gameQueueUrls[g.game_type])
                .map((g) =>
                    this.sqs.sendMessage({
                        queueUrl: config.aws.sqs.gameQueueUrls[g.game_type],
                        payload: {
                            stage_id: stageId,
                            stage_number: stageNumber,
                            game_id: g.id,
                            game_type: g.game_type,
                            action: eventType,
                            occurred_at: new Date().toISOString(),
                            game_config: g,
                        },
                        messageAttributes: {
                            event_type: { DataType: 'String', StringValue: eventType },
                        },
                    }),
                ),
        );
    }

    async addGameToStage(payload: AddGameToStagePayload) {
        await this.ensureStageExists(payload.stage_id);
        await this.ensureGameIdsExist(payload.game_ids);

        const existing = await this.prisma.gameStage.findFirst({
            where: {
                stage_id: payload.stage_id,
                game_id: { in: payload.game_ids },
            },
        });

        if (existing) {
            throw new ConflictException('GAME_STAGE_ALREADY_EXISTS');
        }

        await this.prisma.gameStage.createMany({
            data: payload.game_ids.map((gameId) => ({
                stage_id: payload.stage_id,
                game_id: gameId,
            })),
        });

        await this.prisma.gameContent.deleteMany({
            where: { game_id: { in: payload.game_ids }, stage_id: payload.stage_id },
        });

        await this.seedGameContents(payload.game_ids, payload.stage_id);

        const [stage, gameStages] = await Promise.all([
            this.prisma.stage.findUnique({
                where: { id: payload.stage_id },
                select: { stage_number: true },
            }),
            this.prisma.gameStage.findMany({
                where: {
                    stage_id: payload.stage_id,
                    game_id: { in: payload.game_ids },
                },
                include: { game: true },
                orderBy: {
                    game: { name: SORT_ORDER.ASC },
                },
            }),
        ]);

        await this.publishStageGameEvents(
            payload.stage_id,
            stage!.stage_number,
            payload.game_ids,
            GameConfigEventType.STAGE_ATTACHED,
        );

        return {
            stage_id: payload.stage_id,
            games: gameStages.map((gameStage) => gameStage.game),
        };
    }

    async createStage(payload: CreateStagePayload) {
        if (payload.gameIds) {
            await this.ensureGameIdsExist(payload.gameIds);
        }

        const existing = await this.prisma.stage.findFirst({
            where: { stage_number: payload.stage_number, deleted_at: null },
        });

        if (existing) {
            throw new ConflictException('STAGE_ALREADY_EXISTS');
        }

        const stage = await this.prisma.stage.create({
            data: {
                stage_number: payload.stage_number,
                stage_name: payload.stage_name,
            },
        });

        if (payload.gameIds) {
            await this.prisma.gameStage.createMany({
                data: payload.gameIds.map((gameId) => ({
                    game_id: gameId,
                    stage_id: stage.id,
                })),
            });

            await this.prisma.gameContent.deleteMany({
                where: { game_id: { in: payload.gameIds }, stage_id: stage.id },
            });

            await this.seedGameContents(payload.gameIds, stage.id);

            await this.publishStageGameEvents(
                stage.id,
                stage.stage_number,
                payload.gameIds,
                GameConfigEventType.STAGE_ATTACHED,
            );
        }

        return this.findStageOrThrow(stage.id);
    }

    async listStages(query: ListQueryPayload) {
        const { page, limit, search } = query;
        const numericSearch = search ? Number(search) : Number.NaN;
        const where = {
            deleted_at: null,
            ...(search && {
                OR: [
                    { stage_name: { contains: search, mode: 'insensitive' as const } },
                    ...(Number.isInteger(numericSearch) ? [{ stage_number: numericSearch }] : []),
                ],
            }),
        };

        const [total, stages] = await Promise.all([
            this.prisma.stage.count({ where }),
            this.prisma.stage.findMany({
                where,
                orderBy: { stage_number: SORT_ORDER.ASC },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    tournament_stages: {
                        select: {
                            tournament: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            items: stages.map(({ tournament_stages, ...stage }) => ({
                ...stage,
                tournaments: tournament_stages.map((ts) => ts.tournament),
            })),
            pagination: buildPaginationMeta({ page, limit, total }),
        };
    }

    async getStage(stageId: string) {
        return this.findStageOrThrow(stageId);
    }

    async updateStage(stageId: string, payload: UpdateStagePayload) {
        await this.ensureStageExists(stageId);
        if (payload.gameIds) {
            await this.ensureGameIdsExist(payload.gameIds);
        }

        if (payload.stage_number !== undefined) {
            const existing = await this.prisma.stage.findFirst({
                where: { stage_number: payload.stage_number, deleted_at: null },
                select: { id: true },
            });

            if (existing && existing.id !== stageId) {
                throw new ConflictException('STAGE_ALREADY_EXISTS');
            }
        }

        await this.prisma.stage.update({
            where: { id: stageId },
            data: {
                stage_number: payload.stage_number,
                stage_name: payload.stage_name,
            },
        });

        if (payload.gameIds) {
            const [oldGameStages, updatedStage] = await Promise.all([
                this.prisma.gameStage.findMany({
                    where: { stage_id: stageId },
                    select: { game_id: true },
                }),
                this.prisma.stage.findFirst({
                    where: { id: stageId, deleted_at: null },
                    select: { stage_number: true },
                }),
            ]);

            const oldGameIds = new Set(oldGameStages.map((gs) => gs.game_id));
            const newGameIds = new Set(payload.gameIds);
            const removedIds = [...oldGameIds].filter((id) => !newGameIds.has(id));
            const addedIds = [...newGameIds].filter((id) => !oldGameIds.has(id));

            await this.prisma.gameStage.deleteMany({ where: { stage_id: stageId } });

            await this.prisma.gameStage.createMany({
                data: payload.gameIds.map((gameId) => ({
                    game_id: gameId,
                    stage_id: stageId,
                })),
            });

            const changedIds = [...removedIds, ...addedIds];
            if (changedIds.length > 0) {
                await this.prisma.gameContent.deleteMany({
                    where: { game_id: { in: changedIds }, stage_id: stageId },
                });
            }

            if (addedIds.length > 0) {
                await this.seedGameContents(addedIds, stageId);
            }

            const stageNumber = updatedStage!.stage_number;
            await Promise.all([
                this.publishStageGameEvents(
                    stageId,
                    stageNumber,
                    removedIds,
                    GameConfigEventType.STAGE_DETACHED,
                ),
                this.publishStageGameEvents(
                    stageId,
                    stageNumber,
                    addedIds,
                    GameConfigEventType.STAGE_ATTACHED,
                ),
            ]);
        }

        return this.findStageOrThrow(stageId);
    }

    async deleteStage(stageIds: string[]) {
        await this.ensureStageIdsExist(stageIds);

        const stages = await this.prisma.stage.findMany({
            where: { id: { in: stageIds }, deleted_at: null },
            include: { game_stages: { select: { game_id: true } } },
        });

        await this.prisma.gameStage.deleteMany({
            where: { stage_id: { in: stageIds } },
        });

        await this.prisma.gameContent.deleteMany({
            where: { stage_id: { in: stageIds } },
        });

        const result = await this.prisma.stage.updateMany({
            where: { id: { in: stageIds } },
            data: { deleted_at: new Date() },
        });

        await Promise.all(
            stages.map((stage) =>
                this.publishStageGameEvents(
                    stage.id,
                    stage.stage_number,
                    stage.game_stages.map((gs) => gs.game_id),
                    GameConfigEventType.STAGE_DETACHED,
                ),
            ),
        );

        return result;
    }

    async getStageGames(stageId: string, query: ListQueryPayload) {
        const { page, limit, search } = query;
        await this.ensureStageExists(stageId);

        const gameWhere = {
            deleted_at: null,
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };

        const [stage, total, gameStages] = await Promise.all([
            this.prisma.stage.findFirst({
                where: { id: stageId, deleted_at: null },
            }),
            this.prisma.gameStage.count({
                where: { stage_id: stageId, game: gameWhere },
            }),
            this.prisma.gameStage.findMany({
                where: { stage_id: stageId, game: gameWhere },
                include: { game: true },
                orderBy: {
                    game: { name: SORT_ORDER.ASC },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        if (!stage) {
            throw new NotFoundException('STAGE_NOT_FOUND');
        }

        return {
            ...stage,
            games: gameStages.map((gameStage) => gameStage.game),
            pagination: buildPaginationMeta({ page, limit, total }),
        };
    }

    private async seedGameContents(gameIds: string[], stageId: string): Promise<void> {
        const games = await this.prisma.game.findMany({
            where: { id: { in: gameIds } },
            select: { id: true, game_content: true },
        });

        const languages = ['EN', 'HI'] as const;
        const records = games.flatMap((game) => {
            const contentMap = (game.game_content ?? {}) as Record<string, unknown>;
            return languages.map((lang) => ({
                game_id: game.id,
                stage_id: stageId,
                language: lang,
                content:
                    contentMap[lang] !== undefined
                        ? (contentMap[lang] as Prisma.InputJsonValue)
                        : Prisma.DbNull,
            }));
        });

        await this.prisma.gameContent.createMany({ data: records, skipDuplicates: true });
    }

    private async findStageOrThrow(stageId: string) {
        const stage = await this.prisma.stage.findFirst({
            where: { id: stageId, deleted_at: null },
            include: {
                game_stages: {
                    where: { game: { deleted_at: null } },
                    include: { game: true },
                    orderBy: {
                        game: { name: SORT_ORDER.ASC },
                    },
                },
            },
        });

        if (!stage) {
            throw new NotFoundException('STAGE_NOT_FOUND');
        }

        return stage;
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

    private async ensureStageIdsExist(stageIds: string[]) {
        const total = await this.prisma.stage.count({
            where: { id: { in: stageIds }, deleted_at: null },
        });

        if (total !== stageIds.length) {
            throw new NotFoundException('STAGE_NOT_FOUND');
        }
    }
}
