import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('AnalyticsService - Live Command Center (Module 6.1)', () => {
    let service: AnalyticsService;
    let prisma: {
        user: { count: jest.Mock; findMany: jest.Mock };
        transaction: { aggregate: jest.Mock };
        season: { count: jest.Mock; findMany: jest.Mock };
        gameSession: { count: jest.Mock };
        $queryRaw: jest.Mock;
    };
    let redis: {
        countKeysByPattern: jest.Mock;
        ping: jest.Mock;
    };

    beforeEach(async () => {
        prisma = {
            user: { count: jest.fn(), findMany: jest.fn() },
            transaction: { aggregate: jest.fn() },
            season: { count: jest.fn(), findMany: jest.fn() },
            gameSession: { count: jest.fn() },
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        };

        redis = {
            countKeysByPattern: jest.fn().mockResolvedValue(142), // 142 CCU
            ping: jest.fn().mockResolvedValue(2), // 2ms Redis latency
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                { provide: PrismaService, useValue: prisma },
                { provide: RedisService, useValue: redis },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
    });

    describe('getLiveCommandCenterTelemetry', () => {
        it('should retrieve real-time CCU, active tournament stages, and system latencies', async () => {
            prisma.season.findMany.mockResolvedValue([
                {
                    id: 'season-alpha',
                    name: 'Weekly Blitz Championship',
                    _count: { entries: 500 },
                    stages: [
                        { stage_number: 1, status: 'OPEN', _count: { stage_entries: 250 } },
                        { stage_number: 2, status: 'LOCKED', _count: { stage_entries: 0 } },
                    ],
                },
            ]);

            // hourDeposits, hourWithdrawals, dayDeposits, dayWithdrawals
            prisma.transaction.aggregate
                .mockResolvedValueOnce({ _sum: { amount: 50000 }, _count: { id: 25 } })
                .mockResolvedValueOnce({ _sum: { amount: 15000 }, _count: { id: 10 } })
                .mockResolvedValueOnce({ _sum: { amount: 240000 } })
                .mockResolvedValueOnce({ _sum: { amount: 120000 } });

            const telemetry = await service.getLiveCommandCenterTelemetry();

            expect(telemetry.ccu).toBe(142);
            expect(telemetry.tournaments).toHaveLength(1);
            expect(telemetry.tournaments[0].totalRegistered).toBe(500);
            expect(telemetry.tournaments[0].stages[0].stageNumber).toBe(1);
            expect(telemetry.tournaments[0].stages[0].activePlayers).toBe(250);

            expect(telemetry.velocity.depositVelocityCurrentHour).toBe(50000);
            expect(telemetry.velocity.withdrawalVelocityCurrentHour).toBe(15000);
            // 240000 / 24 = 10000 avg/hr. Current is 50000 (> 3x), so spike is flagged true
            expect(telemetry.velocity.depositSpikeDetected).toBe(true);

            expect(telemetry.systemHealth.status).toBe('HEALTHY');
            expect(telemetry.systemHealth.redisLatencyMs).toBe(2);
            expect(telemetry.systemHealth.memory.heapUsedMB).toBeGreaterThan(0);
        });
    });

    describe('getOverview', () => {
        it('should compute high-level platform statistics', async () => {
            prisma.user.count.mockResolvedValue(1000);
            prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 500000 } });
            prisma.season.count.mockResolvedValue(3);
            prisma.gameSession.count.mockResolvedValue(8500);

            const overview = await service.getOverview();

            expect(overview.total_users).toBe(1000);
            expect(overview.total_revenue).toBe(500000);
            expect(overview.active_seasons).toBe(3);
            expect(overview.total_sessions).toBe(8500);
        });
    });
});
