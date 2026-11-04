import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { S3Service } from '../aws/s3.service';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) {}

    async listUsers(options: { page: number; limit: number; search?: string; status?: string }) {
        const { page, limit, search, status } = options;
        const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
        const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20));
        const skip = (safePage - 1) * safeLimit;
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
                skip,
                take: safeLimit,
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

        return { users, total, page: safePage, total_pages: Math.ceil(total / safeLimit) };
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
        const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
        const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20));
        const skip = (safePage - 1) * safeLimit;

        const [sessions, total] = await Promise.all([
            this.prisma.gameSession.findMany({
                where: { user_id: userId },
                orderBy: { started_at: 'desc' },
                skip,
                take: safeLimit,
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

        return { sessions, total, page: safePage, total_pages: Math.ceil(total / safeLimit) };
    }

    async getUserTransactions(userId: string, page: number, limit: number) {
        const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
        const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20));
        const skip = (safePage - 1) * safeLimit;

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'desc' },
                skip,
                take: safeLimit,
            }),
            this.prisma.transaction.count({ where: { user_id: userId } }),
        ]);

        return { transactions, total, page: safePage, total_pages: Math.ceil(total / safeLimit) };
    }

    async getAllTransactions(page: number, limit: number, type?: string, status?: string) {
        const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
        const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20));
        const skip = (safePage - 1) * safeLimit;

        const where: Record<string, unknown> = {};
        if (type) where.type = type.toUpperCase();
        if (status) where.status = status.toUpperCase();

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: safeLimit,
                include: {
                    user: {
                        select: { id: true, username: true, display_name: true, email: true },
                    },
                },
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return { transactions, total, page: safePage, total_pages: Math.ceil(total / safeLimit) };
    }

    async banUser(userId: string, reason: string) {
        await this.ensureUserExists(userId);

        await this.prisma.user.update({
            where: { id: userId },
            data: { is_banned: true, ban_reason: reason },
        });

        return { success: true, message: `User ${userId} banned` };
    }

    async unbanUser(userId: string) {
        await this.ensureUserExists(userId);

        await this.prisma.user.update({
            where: { id: userId },
            data: { is_banned: false, ban_reason: null },
        });
        return { success: true, message: `User ${userId} unbanned` };
    }

    async creditWallet(userId: string, amount: number, reason: string) {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');
        await this.ensureUserExists(userId);

        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.upsert({
                where: { user_id: userId },
                create: { user_id: userId, balance: amount },
                update: { balance: { increment: amount } },
            });

            const balanceAfter = Number(wallet.balance) + Number(wallet.bonus_balance);

            await tx.transaction.create({
                data: {
                    user_id: userId,
                    type: 'DEPOSIT',
                    amount,
                    balance_after: balanceAfter,
                    status: 'COMPLETED',
                    description: `Admin credit: ${reason}`,
                },
            });

            return { success: true, new_balance: balanceAfter };
        });
    }

    async debitWallet(userId: string, amount: number, reason: string) {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');
        await this.ensureUserExists(userId);

        return this.prisma.$transaction(async (tx) => {
            // Atomic, race-safe debit: decrement only when sufficient cash balance exists.
            const updated = await tx.wallet.updateMany({
                where: { user_id: userId, balance: { gte: amount } },
                data: { balance: { decrement: amount } },
            });
            if (updated.count === 0) {
                throw new BadRequestException('Insufficient balance');
            }

            const wallet = await tx.wallet.findUnique({ where: { user_id: userId } });
            const balanceAfter = Number(wallet!.balance) + Number(wallet!.bonus_balance);

            await tx.transaction.create({
                data: {
                    user_id: userId,
                    type: 'WITHDRAWAL',
                    amount,
                    balance_after: balanceAfter,
                    status: 'COMPLETED',
                    description: `Admin debit: ${reason}`,
                },
            });

            return { success: true, new_balance: balanceAfter };
        });
    }

    async updateUser(userId: string, data: any) {
        await this.ensureUserExists(userId);

        const allowed = ['display_name', 'username', 'is_verified'];
        const updateData: any = {};
        for (const key of allowed) {
            if (data[key] !== undefined) updateData[key] = data[key];
        }

        return this.prisma.user.update({ where: { id: userId }, data: updateData });
    }

    private async ensureUserExists(userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: { id: true },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
    }

    // ─── KYC VERIFICATION DESK (Module 6.3) ───────────────────────

    async getKycReviewQueue(page = 1, limit = 20) {
        const safePage = Math.max(1, Number.isFinite(page) ? page : 1);
        const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20));
        const skip = (safePage - 1) * safeLimit;

        const where = {
            deleted_at: null,
            is_verified: false,
        };

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy: { created_at: 'asc' },
                select: {
                    id: true,
                    username: true,
                    display_name: true,
                    email: true,
                    phone: true,
                    is_verified: true,
                    created_at: true,
                    wallet: {
                        select: {
                            id: true,
                            balance: true,
                            bonus_balance: true,
                            kyc_verified: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            queue: users,
            total,
            page: safePage,
            total_pages: Math.ceil(total / safeLimit),
        };
    }

    async getKycDocumentPreviewUrl(documentKey: string, expiresIn = 300) {
        if (!documentKey || typeof documentKey !== 'string') {
            throw new BadRequestException('Invalid or missing document key');
        }

        // Generate 5-minute presigned preview URL for private S3 document inspection
        const previewUrl = await this.s3.createPresignedDownload(documentKey, expiresIn);

        return {
            document_key: documentKey,
            preview_url: previewUrl,
            expires_in_seconds: expiresIn,
            generated_at: new Date().toISOString(),
        };
    }

    async approveKyc(userId: string, adminId?: string) {
        await this.ensureUserExists(userId);

        await this.prisma.$transaction(async (tx) => {
            // 1. Mark user as verified
            await tx.user.update({
                where: { id: userId },
                data: { is_verified: true },
            });

            // 2. Unlock real-money withdrawals in wallet
            await tx.wallet.upsert({
                where: { user_id: userId },
                update: { kyc_verified: true },
                create: {
                    user_id: userId,
                    kyc_verified: true,
                    balance: 0,
                    bonus_balance: 0,
                    currency: 'INR',
                },
            });

            // 3. Dispatch in-app system notification
            await tx.notification.create({
                data: {
                    user_id: userId,
                    type: 'SYSTEM',
                    title: 'KYC Verification Approved',
                    body: 'Your identity documents have been approved. Real-money withdrawals are now fully unlocked.',
                },
            });

            // 4. Record audit entry
            if (adminId) {
                await tx.auditLog.create({
                    data: {
                        admin_id: adminId,
                        action: 'APPROVE_KYC',
                        entity: 'users',
                        entity_id: userId,
                        changes: { kyc_verified: true, status: 'VERIFIED' },
                    },
                });
            }
        });

        return {
            success: true,
            user_id: userId,
            kyc_verified: true,
            withdrawals_unlocked: true,
            approved_at: new Date().toISOString(),
        };
    }

    async rejectKyc(userId: string, reasonCode: string, reasonMessage: string, adminId?: string) {
        await this.ensureUserExists(userId);

        if (!reasonCode || !reasonMessage) {
            throw new BadRequestException('Mandatory rejection reason code and explanation required');
        }

        await this.prisma.$transaction(async (tx) => {
            // 1. Keep / revert user as unverified
            await tx.user.update({
                where: { id: userId },
                data: { is_verified: false },
            });

            // 2. Lock withdrawals in wallet
            await tx.wallet.upsert({
                where: { user_id: userId },
                update: { kyc_verified: false },
                create: {
                    user_id: userId,
                    kyc_verified: false,
                    balance: 0,
                    bonus_balance: 0,
                    currency: 'INR',
                },
            });

            // 3. Dispatch in-app notification with structured rejection reason
            await tx.notification.create({
                data: {
                    user_id: userId,
                    type: 'SYSTEM',
                    title: 'KYC Verification Rejected',
                    body: `Your identity verification was rejected [Reason: ${reasonCode}]. Details: ${reasonMessage}. Please re-submit clear documents.`,
                    data: { reason_code: reasonCode, reason_message: reasonMessage },
                },
            });

            // 4. Record audit entry
            if (adminId) {
                await tx.auditLog.create({
                    data: {
                        admin_id: adminId,
                        action: 'REJECT_KYC',
                        entity: 'users',
                        entity_id: userId,
                        changes: {
                            kyc_verified: false,
                            status: 'REJECTED',
                            reason_code: reasonCode,
                            reason_message: reasonMessage,
                        },
                    },
                });
            }
        });

        return {
            success: true,
            user_id: userId,
            kyc_verified: false,
            rejection_code: reasonCode,
            rejection_reason: reasonMessage,
            rejected_at: new Date().toISOString(),
        };
    }
}

