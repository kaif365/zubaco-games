import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CheatFlagsService } from './cheat-flags.service';

describe('CheatFlagsService - Fraud & Anti-Cheat Radar (Module 6.4)', () => {
    let service: CheatFlagsService;
    let mockPrisma: any;
    let mockSqs: any;
    let mockRedis: any;
    let redisClient: any;

    beforeEach(() => {
        redisClient = {
            set: jest.fn().mockResolvedValue('OK'),
            get: jest.fn().mockResolvedValue(null),
        };

        mockRedis = {
            getClient: jest.fn().mockReturnValue(redisClient),
        };

        mockSqs = {
            registerHandler: jest.fn(),
        };

        mockPrisma = {
            user: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            wallet: {
                upsert: jest.fn(),
            },
            cheatFlag: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
                upsert: jest.fn(),
            },
            gameSession: {
                findUnique: jest.fn(),
            },
            game: {
                findUnique: jest.fn(),
            },
            notification: {
                create: jest.fn(),
            },
            auditLog: {
                create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(mockPrisma)),
        };

        service = new CheatFlagsService(mockPrisma, mockSqs, mockRedis);
    });

    describe('Flagged Match Detail Inspection', () => {
        it('should throw NotFoundException if flag does not exist', async () => {
            mockPrisma.cheatFlag.findFirst.mockResolvedValue(null);

            await expect(service.getFlaggedMatchDetail('nonexistent')).rejects.toThrow(NotFoundException);
        });

        it('should return flag details with user and game relationships', async () => {
            const flag = {
                id: 'flg-1',
                reference_id: 'ref-100',
                user_id: 'user-suspect',
                flag_type: 1,
                game_created_at: new Date('2026-11-04T10:00:00.000Z'),
                received_at: new Date('2026-11-04T10:00:02.000Z'),
                game: { id: 'g-1', name: 'Arrows', game_type: 'ARROWS' },
            };
            const user = {
                id: 'user-suspect',
                username: 'bot_runner',
                email: 'bot@example.com',
                phone: '+919999999999',
                is_banned: false,
            };

            mockPrisma.cheatFlag.findFirst.mockResolvedValue(flag);
            mockPrisma.user.findUnique.mockResolvedValue(user);

            const result = await service.getFlaggedMatchDetail('flg-1');

            expect(result.flag_id).toBe('flg-1');
            expect(result.user.username).toBe('bot_runner');
            expect(result.game.name).toBe('Arrows');
        });
    });

    describe('Move Replay Telemetry Feed & Biomechanics Analysis', () => {
        it('should throw NotFoundException if session does not exist', async () => {
            mockPrisma.gameSession.findUnique.mockResolvedValue(null);

            await expect(service.getMatchReplayFeed('missing-session')).rejects.toThrow(NotFoundException);
        });

        it('should detect suspicious sub-50ms biomechanics cadence and robotic zero variance', async () => {
            const session = {
                id: 'sess-bot-1',
                user: { id: 'usr-bot', username: 'fast_clicker' },
                game_type: 'ARROWS',
                score: 9999,
                duration_ms: 1200,
                outcome: 'COMPLETED',
                server_seed: 'seed-srv-1',
                client_seed: 'seed-cli-1',
                metadata: {
                    events: [
                        { t: 0, x: 10, y: 10, type: 'click' },
                        { t: 25, x: 10, y: 10, type: 'click' }, // 25ms interval (< 50ms)
                        { t: 50, x: 10, y: 10, type: 'click' }, // 25ms interval
                        { t: 75, x: 10, y: 10, type: 'click' }, // 25ms interval (zero variance)
                    ],
                },
            };

            mockPrisma.gameSession.findUnique.mockResolvedValue(session);

            const result = await service.getMatchReplayFeed('sess-bot-1');

            expect(result.session_id).toBe('sess-bot-1');
            expect(result.event_count).toBe(4);
            expect(result.cadence_analysis.min_interval_ms).toBe(25);
            expect(result.cadence_analysis.suspicious_sub_50ms).toBe(true);
            expect(result.cadence_analysis.suspicious_zero_variance).toBe(true);
        });
    });

    describe('Action: Warn Player', () => {
        it('should throw BadRequestException if warning message is empty', async () => {
            await expect(service.warnPlayer('usr-1', '')).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if user does not exist', async () => {
            mockPrisma.user.findFirst.mockResolvedValue(null);

            await expect(service.warnPlayer('usr-1', 'Fair play warning')).rejects.toThrow(NotFoundException);
        });

        it('should dispatch security warning alert and record audit log', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'usr-1' });

            const result = await service.warnPlayer('usr-1', 'Suspicious tap frequency detected', 'admin-op-1');

            expect(result.success).toBe(true);
            expect(result.action).toBe('WARNED');
            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: {
                    user_id: 'usr-1',
                    type: 'SYSTEM',
                    title: 'Security Alert: Fair Play Policy Warning',
                    body: 'Suspicious tap frequency detected',
                },
            });
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: {
                    admin_id: 'admin-op-1',
                    action: 'WARN_PLAYER',
                    entity: 'users',
                    entity_id: 'usr-1',
                    changes: { warning: 'Suspicious tap frequency detected' },
                },
            });
        });
    });

    describe('Action: Freeze Wallet', () => {
        it('should throw BadRequestException if reason is empty', async () => {
            await expect(service.freezeWallet('usr-1', '')).rejects.toThrow(BadRequestException);
        });

        it('should lock withdrawals, notify user, set Redis freeze key, and record audit log', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'usr-1' });

            const result = await service.freezeWallet('usr-1', 'Under anti-cheat investigation', 'admin-sec-1');

            expect(result.success).toBe(true);
            expect(result.wallet_frozen).toBe(true);
            expect(mockPrisma.wallet.upsert).toHaveBeenCalledWith({
                where: { user_id: 'usr-1' },
                update: { kyc_verified: false },
                create: {
                    user_id: 'usr-1',
                    kyc_verified: false,
                    balance: 0,
                    bonus_balance: 0,
                    currency: 'INR',
                },
            });
            expect(redisClient.set).toHaveBeenCalledWith(
                'wallet:frozen:usr-1',
                expect.stringContaining('Under anti-cheat investigation'),
            );
        });
    });

    describe('Action: Permanent Ban', () => {
        it('should throw BadRequestException if reason is empty', async () => {
            await expect(service.banUser('usr-1', '')).rejects.toThrow(BadRequestException);
        });

        it('should mark user banned in DB, set Redis ban fast-cache, and record audit log', async () => {
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'usr-1' });

            const result = await service.banUser('usr-1', 'Confirmed automated script injection', 'admin-sec-1');

            expect(result.success).toBe(true);
            expect(result.is_banned).toBe(true);
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 'usr-1' },
                data: { is_banned: true, ban_reason: 'Confirmed automated script injection' },
            });
            expect(redisClient.set).toHaveBeenCalledWith('auth:ban:usr-1', '1');
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: {
                    admin_id: 'admin-sec-1',
                    action: 'BAN_USER',
                    entity: 'users',
                    entity_id: 'usr-1',
                    changes: { is_banned: true, ban_reason: 'Confirmed automated script injection' },
                },
            });
        });
    });
});
