import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    async getOverview() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalUsers,
            dau,
            mau,
            totalRevenue,
            monthRevenue,
            activeSeasons,
            totalSessions,
            todaySessions,
        ] = await Promise.all([
            this.prisma.user.count({ where: { deleted_at: null } }),
            this.prisma.user.count({ where: { last_login_at: { gte: todayStart } } }),
            this.prisma.user.count({ where: { last_login_at: { gte: monthStart } } }),
            this.prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: 'COMPLETED' },
                _sum: { amount: true },
            }),
            this.prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: 'COMPLETED', created_at: { gte: monthStart } },
                _sum: { amount: true },
            }),
            this.prisma.season.count({ where: { status: 'ACTIVE' } }),
            this.prisma.gameSession.count(),
            this.prisma.gameSession.count({ where: { started_at: { gte: todayStart } } }),
        ]);

        return {
            total_users: totalUsers,
            dau,
            mau,
            total_revenue: Number(totalRevenue._sum.amount || 0),
            month_revenue: Number(monthRevenue._sum.amount || 0),
            active_seasons: activeSeasons,
            total_sessions: totalSessions,
            today_sessions: todaySessions,
        };
    }

    async getUserGrowth(days: number) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Get daily signups for the period
        const users = await this.prisma.user.findMany({
            where: { created_at: { gte: startDate } },
            select: { created_at: true },
            orderBy: { created_at: 'asc' },
        });

        // Group by day
        const dailyCounts: Record<string, number> = {};
        for (const user of users) {
            const day = user.created_at.toISOString().split('T')[0];
            dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }

        return Object.entries(dailyCounts).map(([date, count]) => ({ date, signups: count }));
    }

    async getRetention() {
        const now = new Date();
        const d1Start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        const d7Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const d30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Users who signed up on each date and came back
        const [signedUpD7, returnedD7] = await Promise.all([
            this.prisma.user.count({ where: { created_at: { gte: d7Start, lt: d1Start } } }),
            this.prisma.user.count({
                where: {
                    created_at: { gte: d7Start, lt: d1Start },
                    last_login_at: { gte: d1Start },
                },
            }),
        ]);

        const [signedUpD30, returnedD30] = await Promise.all([
            this.prisma.user.count({ where: { created_at: { gte: d30Start, lt: d7Start } } }),
            this.prisma.user.count({
                where: {
                    created_at: { gte: d30Start, lt: d7Start },
                    last_login_at: { gte: d7Start },
                },
            }),
        ]);

        return {
            d7_retention: signedUpD7 > 0 ? Math.round((returnedD7 / signedUpD7) * 100) : 0,
            d30_retention: signedUpD30 > 0 ? Math.round((returnedD30 / signedUpD30) * 100) : 0,
            d7_cohort_size: signedUpD7,
            d30_cohort_size: signedUpD30,
        };
    }

    async getRevenue(days: number) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                status: 'COMPLETED',
                created_at: { gte: startDate },
                type: { in: ['DEPOSIT', 'ENTRY_FEE'] },
            },
            select: { type: true, amount: true, created_at: true },
            orderBy: { created_at: 'asc' },
        });

        // Group by day and type
        const dailyRevenue: Record<string, { deposits: number; entry_fees: number }> = {};
        for (const tx of transactions) {
            const day = tx.created_at.toISOString().split('T')[0];
            if (!dailyRevenue[day]) dailyRevenue[day] = { deposits: 0, entry_fees: 0 };
            if (tx.type === 'DEPOSIT') dailyRevenue[day].deposits += Number(tx.amount);
            if (tx.type === 'ENTRY_FEE') dailyRevenue[day].entry_fees += Number(tx.amount);
        }

        return Object.entries(dailyRevenue).map(([date, data]) => ({ date, ...data, total: data.deposits + data.entry_fees }));
    }

    async getGamePopularity() {
        const sessions = await this.prisma.gameSession.groupBy({
            by: ['game_type'],
            _count: { id: true },
            _avg: { score: true },
            orderBy: { _count: { id: 'desc' } },
        });

        return sessions.map((s) => ({
            game_type: s.game_type,
            total_plays: s._count.id,
            avg_score: Math.round(s._avg.score || 0),
        }));
    }

    async getGameCompletionRates() {
        const allSessions = await this.prisma.gameSession.groupBy({
            by: ['game_type'],
            _count: { id: true },
        });

        const completedSessions = await this.prisma.gameSession.groupBy({
            by: ['game_type'],
            where: { outcome: 'COMPLETED' },
            _count: { id: true },
        });

        const completedMap: Record<string, number> = {};
        for (const s of completedSessions) {
            completedMap[s.game_type] = s._count.id;
        }

        return allSessions.map((s) => ({
            game_type: s.game_type,
            total: s._count.id,
            completed: completedMap[s.game_type] || 0,
            completion_rate: s._count.id > 0
                ? Math.round(((completedMap[s.game_type] || 0) / s._count.id) * 100)
                : 0,
        }));
    }

    async getSeasonStats(seasonId?: string) {
        const where: any = seasonId ? { id: seasonId } : { status: 'ACTIVE' };

        const seasons = await this.prisma.season.findMany({
            where,
            include: {
                _count: { select: { entries: true } },
                stages: {
                    include: {
                        _count: { select: { stage_entries: true } },
                    },
                    orderBy: { stage_number: 'asc' },
                },
            },
        });

        return seasons.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            total_players: s._count.entries,
            stages: s.stages.map((st) => ({
                stage_number: st.stage_number,
                status: st.status,
                players: st._count.stage_entries,
            })),
        }));
    }
}
