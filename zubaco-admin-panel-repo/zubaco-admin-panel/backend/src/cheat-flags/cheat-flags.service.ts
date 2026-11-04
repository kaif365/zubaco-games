import { GAME_IDS, GAME_NAMES, SORT_ORDER } from '@common/constants';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildPaginationMeta } from '@common/utils/pagination.util';
import { Injectable, Logger, OnModuleInit, ServiceUnavailableException, NotFoundException, BadRequestException } from '@nestjs/common';

import { SqsService } from '../aws/sqs.service';
import type { CheatFlagEvent } from '../aws/sqs.service';
import { RedisService } from '../redis/redis.service';

import type { ListCheatFlagsPayload } from './dto/list-cheat-flags.dto';

const PLATFORM_API_URL = process.env.PLATFORM_API_URL || 'http://localhost:3000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

@Injectable()
export class CheatFlagsService implements OnModuleInit {
    private readonly logger = new Logger(CheatFlagsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly sqs: SqsService,
        private readonly redis: RedisService,
    ) {}

    onModuleInit(): void {
        this.sqs.registerHandler((event) => this.handleEvent(event));
    }

    private async handleEvent(event: CheatFlagEvent): Promise<void> {
        const gameName = GAME_NAMES[event.gameType];
        const validGameTypes = new Set<number>(Object.values(GAME_IDS));
        const validGameType = validGameTypes.has(event.gameType);

        if (!validGameType || !gameName) {
            this.logger.warn(
                `Unknown gameType "${event.gameType}" — dropping cheat flag ${event.referenceId}`,
            );
            return;
        }

        const game = await this.prisma.game.findUnique({
            where: { name: gameName },
            select: { id: true },
        });

        if (!game) {
            this.logger.warn(
                `Unknown game "${gameName}" for gameType=${event.gameType} — dropping cheat flag ${event.referenceId}`,
            );
            return;
        }

        await this.prisma.cheatFlag.upsert({
            where: { reference_id: event.referenceId },
            create: {
                reference_id: event.referenceId,
                user_id: event.userId,
                flag_type: event.flagType,
                game_type: event.gameType,
                game_id: game.id,
                game_created_at: new Date(event.createdAt),
            },
            update: {},
        });
        this.logger.log(
            `Saved cheat flag ${event.referenceId} (user=${event.userId} type=${event.flagType} gameType=${event.gameType} game=${gameName})`,
        );
    }

    async listCheatFlags(query: ListCheatFlagsPayload) {
        const { page, limit, userId, flagType, gameId } = query;
        const skip = (page - 1) * limit;

        const gameUuid = gameId !== undefined ? await this.resolveGameUuid(gameId) : undefined;
        if (gameId !== undefined && !gameUuid) {
            return { items: [], pagination: buildPaginationMeta({ page, limit, total: 0 }) };
        }

        const where = {
            ...(userId ? { user_id: userId } : {}),
            ...(flagType !== undefined ? { flag_type: flagType } : {}),
            ...(gameUuid ? { game_id: gameUuid } : {}),
        };

        const [total, items] = await Promise.all([
            this.prisma.cheatFlag.count({ where }),
            this.prisma.cheatFlag.findMany({
                where,
                orderBy: { received_at: SORT_ORDER.DESC },
                skip,
                take: limit,
            }),
        ]);

        return {
            items,
            pagination: buildPaginationMeta({ page, limit, total }),
        };
    }

    // ─── FLAG ACTIONS (Proxy to platform anti-cheat API) ─────────────

    async reviewFlag(flagId: string, adminId: string, action: 'dismiss' | 'warn' | 'ban') {
        return this.callPlatformApi(`/anti-cheat/flags/${flagId}/review`, {
            method: 'POST',
            body: { action, admin_id: adminId },
        });
    }

    async unbanUser(userId: string) {
        return this.callPlatformApi(`/anti-cheat/users/${userId}/unban`, {
            method: 'POST',
            body: {},
        });
    }

    async resetRiskScore(userId: string) {
        return this.callPlatformApi(`/anti-cheat/users/${userId}/reset-risk`, {
            method: 'POST',
            body: {},
        });
    }

    async getUserRiskScore(userId: string) {
        return this.callPlatformApi(`/anti-cheat/users/${userId}/risk-score`, {
            method: 'GET',
        });
    }

    // ─── PLATFORM API CLIENT ─────────────────────────────────────────

    private async callPlatformApi(path: string, options: { method: string; body?: any }) {
        if (!INTERNAL_API_KEY) {
            // Fail closed: never call the platform anti-cheat API without a configured key.
            throw new ServiceUnavailableException('Platform integration not configured');
        }
        const url = `${PLATFORM_API_URL}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-api-key': INTERNAL_API_KEY,
        };

        const fetchOptions: RequestInit = { method: options.method, headers };
        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                this.logger.error(`Platform API error: ${response.status} ${response.statusText} — ${url}`);
                return { error: `Platform API returned ${response.status}`, status: response.status };
            }
            return response.json();
        } catch (error) {
            this.logger.error(`Platform API call failed: ${url} — ${error}`);
            return { error: 'Platform API unreachable' };
        }
    }

    private async resolveGameUuid(gameId: number): Promise<string | null> {
        const gameName = GAME_NAMES[gameId];
        if (!gameName) {
            return null;
        }

        const game = await this.prisma.game.findUnique({
            where: { name: gameName },
            select: { id: true },
        });
        return game?.id ?? null;
    }

    // ─── FRAUD & ANTI-CHEAT RADAR (Module 6.4) ──────────────────────

    async getFlaggedMatchDetail(flagId: string) {
        const flag = await this.prisma.cheatFlag.findFirst({
            where: { id: flagId },
            include: { game: { select: { id: true, name: true, game_type: true } } },
        });

        if (!flag) {
            throw new NotFoundException(`Cheat flag ${flagId} not found`);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: flag.user_id },
            select: { id: true, username: true, email: true, phone: true, is_banned: true },
        });

        return {
            flag_id: flag.id,
            reference_id: flag.reference_id,
            user_id: flag.user_id,
            user,
            flag_type: flag.flag_type,
            game: flag.game,
            created_at: flag.game_created_at,
            received_at: flag.received_at,
        };
    }

    async getMatchReplayFeed(sessionId: string) {
        const session = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: { user: { select: { id: true, username: true, display_name: true } } },
        });

        if (!session) {
            throw new NotFoundException(`Game session ${sessionId} not found`);
        }

        const metadata = (session.metadata as any) || {};
        const events: Array<{ t: number; x?: number; y?: number; type?: string }> = metadata.events || [];

        // Compute biomechanics cadence intervals
        const intervals: number[] = [];
        for (let i = 1; i < events.length; i++) {
            const dt = events[i].t - events[i - 1].t;
            if (dt >= 0) intervals.push(dt);
        }

        const minInterval = intervals.length > 0 ? Math.min(...intervals) : null;
        const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
        const variance = intervals.length > 0 && avgInterval !== null
            ? intervals.reduce((acc, dt) => acc + Math.pow(dt - avgInterval, 2), 0) / intervals.length
            : null;
        const stdDev = variance !== null ? Math.sqrt(variance) : null;

        const isSub50msCadence = minInterval !== null && minInterval < 50;
        const isBotStdDev = stdDev !== null && stdDev < 5;

        return {
            session_id: session.id,
            user: session.user,
            game_type: session.game_type,
            score: session.score,
            duration_ms: session.duration_ms,
            outcome: session.outcome,
            server_seed: session.server_seed,
            client_seed: session.client_seed,
            event_count: events.length,
            cadence_analysis: {
                min_interval_ms: minInterval,
                avg_interval_ms: avgInterval ? Math.round(avgInterval * 100) / 100 : null,
                std_dev_ms: stdDev ? Math.round(stdDev * 100) / 100 : null,
                suspicious_sub_50ms: isSub50msCadence,
                suspicious_zero_variance: isBotStdDev,
            },
            replay_events: events,
        };
    }

    async warnPlayer(userId: string, warningMessage: string, adminId?: string) {
        if (!warningMessage) {
            throw new BadRequestException('Warning message is mandatory');
        }

        const user = await this.prisma.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: { id: true },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.notification.create({
                data: {
                    user_id: userId,
                    type: 'SYSTEM',
                    title: 'Security Alert: Fair Play Policy Warning',
                    body: warningMessage,
                },
            });

            if (adminId) {
                await tx.auditLog.create({
                    data: {
                        admin_id: adminId,
                        action: 'WARN_PLAYER',
                        entity: 'users',
                        entity_id: userId,
                        changes: { warning: warningMessage },
                    },
                });
            }
        });

        return {
            success: true,
            user_id: userId,
            action: 'WARNED',
            message: warningMessage,
            timestamp: new Date().toISOString(),
        };
    }

    async freezeWallet(userId: string, reason: string, adminId?: string) {
        if (!reason) {
            throw new BadRequestException('Freeze reason is mandatory');
        }

        const user = await this.prisma.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: { id: true },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.prisma.$transaction(async (tx) => {
            // Lock withdrawals in wallet
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

            await tx.notification.create({
                data: {
                    user_id: userId,
                    type: 'SYSTEM',
                    title: 'Wallet Frozen',
                    body: `Your wallet transactions and withdrawals have been temporarily frozen: ${reason}. Please contact support.`,
                },
            });

            if (adminId) {
                await tx.auditLog.create({
                    data: {
                        admin_id: adminId,
                        action: 'FREEZE_WALLET',
                        entity: 'wallets',
                        entity_id: userId,
                        changes: { kyc_verified: false, freeze_reason: reason },
                    },
                });
            }
        });

        // Set fast-path freeze marker in Redis
        await this.redis.getClient()?.set(`wallet:frozen:${userId}`, JSON.stringify({ frozen: true, reason }));

        return {
            success: true,
            user_id: userId,
            wallet_frozen: true,
            reason,
            timestamp: new Date().toISOString(),
        };
    }

    async banUser(userId: string, reason: string, adminId?: string) {
        if (!reason) {
            throw new BadRequestException('Ban reason is mandatory');
        }

        const user = await this.prisma.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: { id: true },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { is_banned: true, ban_reason: reason },
            });

            await tx.notification.create({
                data: {
                    user_id: userId,
                    type: 'SYSTEM',
                    title: 'Account Permanently Suspended',
                    body: `Your account has been permanently suspended for violation of our terms: ${reason}`,
                },
            });

            if (adminId) {
                await tx.auditLog.create({
                    data: {
                        admin_id: adminId,
                        action: 'BAN_USER',
                        entity: 'users',
                        entity_id: userId,
                        changes: { is_banned: true, ban_reason: reason },
                    },
                });
            }
        });

        // Proactively set ban in Redis cache
        await this.redis.getClient()?.set(`auth:ban:${userId}`, '1');

        return {
            success: true,
            user_id: userId,
            is_banned: true,
            reason,
            timestamp: new Date().toISOString(),
        };
    }
}
