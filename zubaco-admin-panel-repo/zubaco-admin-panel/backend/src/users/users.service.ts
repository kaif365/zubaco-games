import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async listUsers(options: { page: number; limit: number; search?: string; status?: string }) {
        const { page, limit, search, status } = options;
        const where: any = { deleted_at: null };

        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { display_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }

        if (status === 'banned') where.is_banned = true;
        if (status === 'active') where.is_banned = false;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    username: true,
                    display_name: true,
                    email: true,
                    phone: true,
                    xp: true,
                    level: true,
                    is_banned: true,
                    is_verified: true,
                    created_at: true,
                    last_login_at: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return { users, total, page, total_pages: Math.ceil(total / limit) };
    }

    async getUserDetail(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                game_progress: { select: { game_type: true, highest_level: true, total_plays: true, best_score: true } },
                season_entries: { select: { season_id: true, status: true, registered_at: true } },
                auth_providers: { select: { provider: true, provider_email: true, created_at: true } },
                _count: { select: { game_sessions: true, notifications: true } },
            },
        });

        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async getUserGameHistory(userId: string, page: number, limit: number) {
        const [sessions, total] = await Promise.all([
            this.prisma.gameSession.findMany({
                where: { user_id: userId },
                orderBy: { started_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    game_type: true,
                    mode: true,
                    level: true,
                    score: true,
                    duration_ms: true,
                    outcome: true,
                    started_at: true,
                    completed_at: true,
                },
            }),
            this.prisma.gameSession.count({ where: { user_id: userId } }),
        ]);

        return { sessions, total, page, total_pages: Math.ceil(total / limit) };
    }

    async getUserTransactions(userId: string, page: number, limit: number) {
        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.transaction.count({ where: { user_id: userId } }),
        ]);

        return { transactions, total, page, total_pages: Math.ceil(total / limit) };
    }

    async banUser(userId: string, reason: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        await this.prisma.user.update({
            where: { id: userId },
            data: { is_banned: true, ban_reason: reason },
        });

        return { success: true, message: `User ${userId} banned` };
    }

    async unbanUser(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { is_banned: false, ban_reason: null },
        });
        return { success: true, message: `User ${userId} unbanned` };
    }

    async creditWallet(userId: string, amount: number, reason: string) {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');

        const wallet = await this.prisma.wallet.upsert({
            where: { user_id: userId },
            create: { user_id: userId, balance: amount },
            update: { balance: { increment: amount } },
        });

        await this.prisma.transaction.create({
            data: {
                user_id: userId,
                type: 'DEPOSIT',
                amount,
                balance_after: wallet.balance,
                status: 'COMPLETED',
                description: `Admin credit: ${reason}`,
            },
        });

        return { success: true, new_balance: wallet.balance };
    }

    async debitWallet(userId: string, amount: number, reason: string) {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');

        const wallet = await this.prisma.wallet.findUnique({ where: { user_id: userId } });
        if (!wallet || Number(wallet.balance) < amount) {
            throw new BadRequestException('Insufficient balance');
        }

        const updated = await this.prisma.wallet.update({
            where: { user_id: userId },
            data: { balance: { decrement: amount } },
        });

        await this.prisma.transaction.create({
            data: {
                user_id: userId,
                type: 'WITHDRAWAL',
                amount,
                balance_after: updated.balance,
                status: 'COMPLETED',
                description: `Admin debit: ${reason}`,
            },
        });

        return { success: true, new_balance: updated.balance };
    }

    async updateUser(userId: string, data: any) {
        const allowed = ['display_name', 'username', 'is_verified'];
        const updateData: any = {};
        for (const key of allowed) {
            if (data[key] !== undefined) updateData[key] = data[key];
        }

        return this.prisma.user.update({ where: { id: userId }, data: updateData });
    }
}
