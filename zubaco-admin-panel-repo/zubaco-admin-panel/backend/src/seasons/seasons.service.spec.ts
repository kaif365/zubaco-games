import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SeasonsService } from './seasons.service';

describe('SeasonsService - Emergency Controls & Orchestration (Module 6.2)', () => {
    let service: SeasonsService;
    let mockPrisma: any;
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

        mockPrisma = {
            season: {
                create: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
                count: jest.fn(),
            },
            seasonStage: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            seasonEntry: {
                updateMany: jest.fn(),
            },
            wallet: {
                upsert: jest.fn(),
            },
            transaction: {
                findFirst: jest.fn(),
                create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(mockPrisma)),
        };

        service = new SeasonsService(mockPrisma, mockRedis);
    });

    describe('Tournament Creation & Validation', () => {
        it('should successfully create a season with valid dates', async () => {
            const data = {
                name: 'Mega Cognitive Cup',
                description: 'Tournament season',
                start_date: '2026-11-10T10:00:00.000Z',
                end_date: '2026-11-15T18:00:00.000Z',
                prize_pool: 100000,
                entry_fee: 50,
                max_players: 500,
            };

            mockPrisma.season.create.mockResolvedValue({ id: 'season-1', ...data, status: 'UPCOMING' });

            const result = await service.createSeason(data);
            expect(result.id).toBe('season-1');
            expect(mockPrisma.season.create).toHaveBeenCalledWith({
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
        });

        it('should reject creation if dates are invalid', async () => {
            await expect(
                service.createSeason({
                    name: 'Bad Dates Cup',
                    start_date: 'not-a-date',
                    end_date: '2026-11-15T18:00:00.000Z',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should reject creation if end_date is before start_date', async () => {
            await expect(
                service.createSeason({
                    name: 'Time Travel Cup',
                    start_date: '2026-11-15T18:00:00.000Z',
                    end_date: '2026-11-10T10:00:00.000Z',
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('Emergency Control: Pause Stage', () => {
        it('should throw NotFoundException if stage does not exist', async () => {
            mockPrisma.seasonStage.findUnique.mockResolvedValue(null);

            await expect(service.pauseStage('nonexistent')).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if stage is not OPEN', async () => {
            mockPrisma.seasonStage.findUnique.mockResolvedValue({ id: 'stg-1', status: 'CLOSED' });

            await expect(service.pauseStage('stg-1')).rejects.toThrow(BadRequestException);
        });

        it('should pause an OPEN stage and record in Redis', async () => {
            mockPrisma.seasonStage.findUnique.mockResolvedValue({ id: 'stg-1', status: 'OPEN' });

            const result = await service.pauseStage('stg-1');
            expect(result.success).toBe(true);
            expect(result.status).toBe('PAUSED');
            expect(redisClient.set).toHaveBeenCalledWith(
                'stage:pause:stg-1',
                expect.stringContaining('pausedAt'),
            );
        });
    });

    describe('Emergency Control: Extend Stage Timer', () => {
        it('should throw BadRequestException for non-positive minutes', async () => {
            await expect(service.extendStageTimer('stg-1', 0)).rejects.toThrow(BadRequestException);
            await expect(service.extendStageTimer('stg-1', -15)).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if stage does not exist', async () => {
            mockPrisma.seasonStage.findUnique.mockResolvedValue(null);

            await expect(service.extendStageTimer('stg-missing', 10)).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if stage is not OPEN', async () => {
            mockPrisma.seasonStage.findUnique.mockResolvedValue({ id: 'stg-1', status: 'COMPLETED' });

            await expect(service.extendStageTimer('stg-1', 10)).rejects.toThrow(BadRequestException);
        });

        it('should extend stage close_date by X minutes and update DB', async () => {
            const initialClose = new Date('2026-11-04T21:00:00.000Z');
            mockPrisma.seasonStage.findUnique.mockResolvedValue({
                id: 'stg-1',
                status: 'OPEN',
                close_date: initialClose,
            });
            mockPrisma.seasonStage.update.mockResolvedValue({});

            const result = await service.extendStageTimer('stg-1', 15);
            expect(result.success).toBe(true);
            expect(result.extended_minutes).toBe(15);

            const expectedClose = new Date('2026-11-04T21:15:00.000Z');
            expect(mockPrisma.seasonStage.update).toHaveBeenCalledWith({
                where: { id: 'stg-1' },
                data: { close_date: expectedClose },
            });
        });
    });

    describe('Emergency Control: Cancel & Full Refund Pipeline', () => {
        it('should throw NotFoundException if season does not exist', async () => {
            mockPrisma.season.findUnique.mockResolvedValue(null);

            await expect(service.cancelAndRefundSeason('missing-season', 'Admin emergency')).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if season is already CANCELLED', async () => {
            mockPrisma.season.findUnique.mockResolvedValue({ id: 's-1', status: 'CANCELLED' });

            await expect(service.cancelAndRefundSeason('s-1', 'Reason')).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if season is already COMPLETED', async () => {
            mockPrisma.season.findUnique.mockResolvedValue({ id: 's-1', status: 'COMPLETED' });

            await expect(service.cancelAndRefundSeason('s-1', 'Reason')).rejects.toThrow(BadRequestException);
        });

        it('should cancel season, withdraw entries, and issue idempotent wallet refunds', async () => {
            const season = {
                id: 'season-99',
                name: 'Championship 2026',
                status: 'LIVE',
                entry_fee: 100,
                entries: [
                    { id: 'entry-1', user_id: 'user-A' },
                    { id: 'entry-2', user_id: 'user-B' },
                ],
            };

            mockPrisma.season.findUnique.mockResolvedValue(season);
            // user-A has no refund yet, user-B already has a refund recorded (simulating idempotency)
            mockPrisma.transaction.findFirst
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: 'existing-tx-id' });

            mockPrisma.wallet.upsert.mockResolvedValue({ user_id: 'user-A', balance: 100 });
            const result = await service.cancelAndRefundSeason('season-99', 'Platform service disruption');

            expect(result.success).toBe(true);
            expect(result.status).toBe('CANCELLED');
            expect(result.refunded_players).toBe(1);
            expect(result.total_refunded_amount).toBe(100);

            // Verified season status updated
            expect(mockPrisma.season.update).toHaveBeenCalledWith({
                where: { id: 'season-99' },
                data: { status: 'CANCELLED' },
            });

            // Verified entries withdrawn
            expect(mockPrisma.seasonEntry.updateMany).toHaveBeenCalledWith({
                where: { season_id: 'season-99' },
                data: { status: 'WITHDRAWN' },
            });

            // Verified wallet credited for user-A
            expect(mockPrisma.wallet.upsert).toHaveBeenCalledWith({
                where: { user_id: 'user-A' },
                update: {
                    balance: { increment: 100 },
                },
                create: {
                    user_id: 'user-A',
                    balance: 100,
                    bonus_balance: 0,
                    currency: 'INR',
                },
            });

            // Verified transaction ledger entry created with idempotency key
            expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    user_id: 'user-A',
                    type: 'REFUND',
                    amount: 100,
                    reference_id: 'refund:season-99:user-A',
                }),
            });
        });
    });
});
