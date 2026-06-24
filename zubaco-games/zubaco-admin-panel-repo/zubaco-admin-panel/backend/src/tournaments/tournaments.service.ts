import { SORT_ORDER } from '@common/constants';
import { ListQueryPayload } from '@common/dto/list-query.dto';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildPaginationMeta } from '@common/utils/pagination.util';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { AddStageToTournamentPayload } from './dto/add-stage-to-tournament.dto';
import type { CreateTournamentPayload } from './dto/create-tournament.dto';
import type { UpdateTournamentPayload } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
    constructor(private readonly prisma: PrismaService) {}

    async addStageToTournament(payload: AddStageToTournamentPayload) {
        await this.ensureTournamentExists(payload.tournament_id);
        await this.ensureStageIdsExist(payload.stage_ids);

        const existing = await this.prisma.tournamentStage.findFirst({
            where: {
                tournament_id: payload.tournament_id,
                stage_id: { in: payload.stage_ids },
            },
        });

        if (existing) {
            throw new ConflictException('TOURNAMENT_STAGE_ALREADY_EXISTS');
        }

        await this.prisma.tournamentStage.createMany({
            data: payload.stage_ids.map((stageId) => ({
                tournament_id: payload.tournament_id,
                stage_id: stageId,
            })),
        });

        const tournamentStages = await this.prisma.tournamentStage.findMany({
            where: {
                tournament_id: payload.tournament_id,
                stage_id: { in: payload.stage_ids },
            },
            include: {
                stage: {
                    include: {
                        game_stages: {
                            where: { game: { deleted_at: null } },
                            include: { game: true },
                            orderBy: {
                                game: { name: SORT_ORDER.ASC },
                            },
                        },
                    },
                },
            },
            orderBy: {
                stage: { stage_number: SORT_ORDER.ASC },
            },
        });

        return {
            tournament_id: payload.tournament_id,
            stages: tournamentStages.map((tournamentStage) =>
                this.withGames(tournamentStage.stage),
            ),
        };
    }

    async createTournament(payload: CreateTournamentPayload) {
        if (payload.stageIds) {
            await this.ensureStageIdsExist(payload.stageIds);
        }

        const existing = await this.prisma.tournament.findFirst({
            where: { name: payload.name, deleted_at: null },
        });

        if (existing) {
            throw new ConflictException('TOURNAMENT_ALREADY_EXISTS');
        }

        const tournament = await this.prisma.tournament.create({
            data: {
                name: payload.name,
                start_date: payload.start_date,
                end_date: payload.end_date,
                status: payload.status,
            },
        });

        if (payload.stageIds) {
            await this.prisma.tournamentStage.createMany({
                data: payload.stageIds.map((stageId) => ({
                    tournament_id: tournament.id,
                    stage_id: stageId,
                })),
            });
        }

        return this.getTournament(tournament.id);
    }

    async listTournaments(query: ListQueryPayload) {
        const { page, limit, search } = query;
        const where = {
            deleted_at: null,
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };

        const [total, tournaments] = await Promise.all([
            this.prisma.tournament.count({ where }),
            this.prisma.tournament.findMany({
                where,
                include: {
                    tournament_stages: {
                        where: { stage: { deleted_at: null } },
                        include: {
                            stage: {
                                include: {
                                    _count: {
                                        select: {
                                            game_stages: { where: { game: { deleted_at: null } } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { created_at: SORT_ORDER.DESC },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return {
            items: tournaments.map((tournament) => {
                const { tournament_stages, ...tournamentData } = tournament;
                const stages_count = tournament_stages.length;
                const games_count = tournament_stages.reduce(
                    (sum, ts) => sum + ts.stage._count.game_stages,
                    0,
                );
                return { ...tournamentData, stages_count, games_count };
            }),
            pagination: buildPaginationMeta({ page, limit, total }),
        };
    }

    async getTournament(tournamentId: string) {
        const tournament = await this.findTournamentOrThrow(tournamentId);
        const result = this.withStages(tournament);
        const stages_count = result.stages.length;
        const games_count = result.stages.reduce((sum, stage) => sum + stage.games.length, 0);

        return { ...result, stages_count, games_count };
    }

    async updateTournament(tournamentId: string, payload: UpdateTournamentPayload) {
        await this.ensureTournamentExists(tournamentId);

        if (payload.start_date !== undefined || payload.end_date !== undefined) {
            const existing = await this.prisma.tournament.findFirst({
                where: { id: tournamentId },
                select: { start_date: true, end_date: true },
            });

            const effectiveStart = payload.start_date
                ? new Date(payload.start_date)
                : existing?.start_date;
            const effectiveEnd = payload.end_date ? new Date(payload.end_date) : existing?.end_date;

            if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
                throw new BadRequestException('end_date must be on or after start_date');
            }
        }

        if (payload.stageIds) {
            await this.ensureStageIdsExist(payload.stageIds);
        }

        if (payload.name) {
            const existing = await this.prisma.tournament.findFirst({
                where: { name: payload.name, deleted_at: null },
                select: { id: true },
            });

            if (existing && existing.id !== tournamentId) {
                throw new ConflictException('TOURNAMENT_ALREADY_EXISTS');
            }
        }

        await this.prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                name: payload.name,
                start_date: payload.start_date,
                end_date: payload.end_date,
                status: payload.status,
            },
        });

        if (payload.stageIds) {
            await this.prisma.tournamentStage.deleteMany({
                where: { tournament_id: tournamentId },
            });

            await this.prisma.tournamentStage.createMany({
                data: payload.stageIds.map((stageId) => ({
                    tournament_id: tournamentId,
                    stage_id: stageId,
                })),
            });
        }

        return this.getTournament(tournamentId);
    }

    async deleteTournament(tournamentIds: string[]) {
        await this.ensureTournamentIdsExist(tournamentIds);

        return this.prisma.tournament.updateMany({
            where: { id: { in: tournamentIds } },
            data: { deleted_at: new Date() },
        });
    }

    async listStages(tournamentId: string, query: ListQueryPayload) {
        const { page, limit, search } = query;
        await this.ensureTournamentExists(tournamentId);

        const numericSearch = search ? Number(search) : Number.NaN;
        const stageWhere = search
            ? {
                  OR: [
                      {
                          stage_name: {
                              contains: search,
                              mode: 'insensitive' as const,
                          },
                      },
                      ...(Number.isInteger(numericSearch) ? [{ stage_number: numericSearch }] : []),
                  ],
              }
            : undefined;

        const stageFilter = { deleted_at: null, ...(stageWhere ?? {}) };

        const [total, tournamentStages] = await Promise.all([
            this.prisma.tournamentStage.count({
                where: { tournament_id: tournamentId, stage: stageFilter },
            }),
            this.prisma.tournamentStage.findMany({
                where: { tournament_id: tournamentId, stage: stageFilter },
                include: {
                    stage: {
                        include: {
                            game_stages: {
                                where: { game: { deleted_at: null } },
                                include: { game: true },
                                orderBy: {
                                    game: { name: SORT_ORDER.ASC },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    stage: { stage_number: SORT_ORDER.ASC },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return {
            items: tournamentStages.map((tournamentStage) => this.withGames(tournamentStage.stage)),
            pagination: buildPaginationMeta({ page, limit, total }),
        };
    }

    async removeStage(tournamentId: string, stageIds: string[]) {
        await this.ensureTournamentExists(tournamentId);
        await this.ensureStageIdsExist(stageIds);

        const tournamentStages = await this.prisma.tournamentStage.findMany({
            where: {
                tournament_id: tournamentId,
                stage_id: { in: stageIds },
            },
            include: {
                stage: {
                    include: {
                        game_stages: {
                            include: { game: true },
                            orderBy: {
                                game: { name: SORT_ORDER.ASC },
                            },
                        },
                    },
                },
            },
        });

        if (tournamentStages.length !== stageIds.length) {
            throw new NotFoundException('STAGE_NOT_FOUND');
        }

        await this.prisma.tournamentStage.deleteMany({
            where: {
                tournament_id: tournamentId,
                stage_id: { in: stageIds },
            },
        });

        return {
            tournament_id: tournamentId,
            stages: tournamentStages.map((tournamentStage) =>
                this.withGames(tournamentStage.stage),
            ),
        };
    }

    private async findTournamentOrThrow(tournamentId: string) {
        const tournament = await this.prisma.tournament.findFirst({
            where: { id: tournamentId, deleted_at: null },
            include: {
                tournament_stages: {
                    where: { stage: { deleted_at: null } },
                    include: {
                        stage: {
                            include: {
                                game_stages: {
                                    where: { game: { deleted_at: null } },
                                    include: { game: true },
                                    orderBy: {
                                        game: { name: SORT_ORDER.ASC },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        stage: { stage_number: SORT_ORDER.ASC },
                    },
                },
            },
        });

        if (!tournament) {
            throw new NotFoundException('TOURNAMENT_NOT_FOUND');
        }

        return tournament;
    }

    private async ensureTournamentExists(tournamentId: string) {
        const tournament = await this.prisma.tournament.findFirst({
            where: { id: tournamentId, deleted_at: null },
            select: { id: true },
        });

        if (!tournament) {
            throw new NotFoundException('TOURNAMENT_NOT_FOUND');
        }
    }

    private async ensureTournamentIdsExist(tournamentIds: string[]) {
        const total = await this.prisma.tournament.count({
            where: { id: { in: tournamentIds }, deleted_at: null },
        });

        if (total !== tournamentIds.length) {
            throw new NotFoundException('TOURNAMENT_NOT_FOUND');
        }
    }

    private async ensureStageExists(stageId: string) {
        const stage = await this.prisma.stage.findUnique({
            where: { id: stageId },
            select: { id: true },
        });

        if (!stage) {
            throw new NotFoundException('STAGE_NOT_FOUND');
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

    private withStages<
        T extends {
            tournament_stages: Array<{
                stage: {
                    game_stages: Array<{ game: unknown }>;
                };
            }>;
        },
    >(tournament: T) {
        const { tournament_stages, ...tournamentData } = tournament;

        return {
            ...tournamentData,
            stages: tournament_stages.map((tournamentStage) =>
                this.withGames(tournamentStage.stage),
            ),
        };
    }

    private withGames<
        T extends {
            game_stages: Array<{ game: unknown }>;
        },
    >(stage: T) {
        const { game_stages, ...stageData } = stage;

        return {
            ...stageData,
            games: game_stages.map((gameStage) => gameStage.game),
        };
    }
}
