import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class SeasonsService {
    constructor(private readonly prisma: PrismaService) {}

    async createSeason(data: {
        name: string;
        description?: string;
        start_date: string;
        end_date: string;
        prize_pool?: number;
        entry_fee?: number;
        max_players?: number;
    }) {
        return this.prisma.season.create({
            data: {
                name: data.name,
                description: data.description,
                start_date: new Date(data.start_date),
                end_date: new Date(data.end_date),
                prize_pool: data.prize_pool,
                entry_fee: data.entry_fee,
                max_players: data.max_players,
                status: 'UPCOMING',
            },
        });
    }

    async listSeasons(page: number, limit: number, status?: string) {
        const where: any = {};
        if (status) where.status = status;

        const [seasons, total] = await Promise.all([
            this.prisma.season.findMany({
                where,
                orderBy: { start_date: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    _count: { select: { entries: true, stages: true } },
                },
            }),
            this.prisma.season.count({ where }),
        ]);

        return { seasons, total, page, total_pages: Math.ceil(total / limit) };
    }

    async getSeasonDetail(seasonId: string) {
        const season = await this.prisma.season.findUnique({
            where: { id: seasonId },
            include: {
                stages: {
                    orderBy: { stage_number: 'asc' },
                    include: {
                        stage_games: true,
                        _count: { select: { stage_entries: true } },
                    },
                },
                _count: { select: { entries: true } },
            },
        });

        if (!season) throw new NotFoundException('Season not found');
        return season;
    }

    async updateSeason(seasonId: string, data: any) {
        const allowed = ['name', 'description', 'start_date', 'end_date', 'prize_pool', 'entry_fee', 'max_players', 'status'];
        const updateData: any = {};
        for (const key of allowed) {
            if (data[key] !== undefined) {
                updateData[key] = ['start_date', 'end_date'].includes(key) ? new Date(data[key]) : data[key];
            }
        }

        return this.prisma.season.update({ where: { id: seasonId }, data: updateData });
    }

    async deleteSeason(seasonId: string) {
        // Only allow deleting UPCOMING seasons
        const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
        if (!season) throw new NotFoundException('Season not found');
        if (season.status !== 'UPCOMING') {
            throw new BadRequestException('Can only delete upcoming seasons');
        }

        await this.prisma.season.delete({ where: { id: seasonId } });
        return { success: true };
    }

    // ─── STAGE MANAGEMENT ────────────────────────────────────────

    async addStage(seasonId: string, data: {
        stage_number: number;
        name?: string;
        open_date: string;
        close_date: string;
        elimination_pct?: number;
    }) {
        return this.prisma.seasonStage.create({
            data: {
                season_id: seasonId,
                stage_number: data.stage_number,
                name: data.name || `Stage ${data.stage_number}`,
                open_date: new Date(data.open_date),
                close_date: new Date(data.close_date),
                elimination_pct: data.elimination_pct || 50.0,
                status: 'LOCKED',
            },
        });
    }

    async updateStage(stageId: string, data: any) {
        const allowed = ['name', 'open_date', 'close_date', 'elimination_pct', 'status'];
        const updateData: any = {};
        for (const key of allowed) {
            if (data[key] !== undefined) {
                updateData[key] = ['open_date', 'close_date'].includes(key) ? new Date(data[key]) : data[key];
            }
        }
        return this.prisma.seasonStage.update({ where: { id: stageId }, data: updateData });
    }

    async openStage(stageId: string) {
        return this.prisma.seasonStage.update({
            where: { id: stageId },
            data: { status: 'OPEN' },
        });
    }

    async closeStage(stageId: string) {
        return this.prisma.seasonStage.update({
            where: { id: stageId },
            data: { status: 'CLOSED' },
        });
    }

    async triggerElimination(stageId: string) {
        const stage = await this.prisma.seasonStage.findUnique({
            where: { id: stageId },
            include: { stage_entries: { orderBy: { total_score: 'desc' } } },
        });

        if (!stage) throw new NotFoundException('Stage not found');
        if (stage.status !== 'CLOSED') throw new BadRequestException('Stage must be closed before elimination');

        const entries = stage.stage_entries;
        const totalPlayers = entries.length;
        const eliminateCount = Math.floor(totalPlayers * (stage.elimination_pct / 100));
        const cutoffIndex = totalPlayers - eliminateCount;

        // Assign ranks and eliminate
        const updates = entries.map((entry, idx) => {
            const rank = idx + 1;
            const eliminated = rank > cutoffIndex;

            return this.prisma.stageEntry.update({
                where: { id: entry.id },
                data: { rank, eliminated },
            });
        });

        await this.prisma.$transaction(updates);

        // Update season entries for eliminated players
        const eliminatedEntries = entries.slice(cutoffIndex);
        if (eliminatedEntries.length > 0) {
            const seasonEntryIds = eliminatedEntries.map((e) => e.season_entry_id);
            await this.prisma.seasonEntry.updateMany({
                where: { id: { in: seasonEntryIds } },
                data: { status: 'ELIMINATED' },
            });
        }

        return {
            success: true,
            total_players: totalPlayers,
            eliminated: eliminateCount,
            advanced: totalPlayers - eliminateCount,
        };
    }

    // ─── GAME ASSIGNMENT ─────────────────────────────────────────

    async assignGamesToStage(stageId: string, games: { game_type: string; game_order: number; level_config_id?: string }[]) {
        // Remove existing assignments
        await this.prisma.stageGame.deleteMany({ where: { season_stage_id: stageId } });

        // Create new assignments
        const created = await this.prisma.stageGame.createMany({
            data: games.map((g) => ({
                season_stage_id: stageId,
                game_type: g.game_type as any,
                game_order: g.game_order,
                level_config_id: g.level_config_id || null,
            })),
        });

        return { success: true, games_assigned: created.count };
    }

    // ─── PLAYER MANAGEMENT ───────────────────────────────────────

    async getSeasonPlayers(seasonId: string, page: number, limit: number, status?: string) {
        const where: any = { season_id: seasonId };
        if (status) where.status = status;

        const [entries, total] = await Promise.all([
            this.prisma.seasonEntry.findMany({
                where,
                orderBy: { registered_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: { id: true, username: true, display_name: true } },
                    stage_entries: { select: { season_stage_id: true, total_score: true, rank: true, eliminated: true } },
                },
            }),
            this.prisma.seasonEntry.count({ where }),
        ]);

        return { entries, total, page, total_pages: Math.ceil(total / limit) };
    }

    async disqualifyPlayer(seasonId: string, userId: string, reason: string) {
        const entry = await this.prisma.seasonEntry.findFirst({
            where: { season_id: seasonId, user_id: userId },
        });

        if (!entry) throw new NotFoundException('Player not enrolled in this season');

        await this.prisma.seasonEntry.update({
            where: { id: entry.id },
            data: { status: 'ELIMINATED' },
        });

        return { success: true, message: `Player disqualified: ${reason}` };
    }
}
