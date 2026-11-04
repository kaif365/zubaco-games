import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from './common/prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController (Module 9.5)', () => {
  let controller: HealthController;
  let prisma: { $queryRawUnsafe: jest.Mock };
  let redis: { set: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /health (informational)', () => {
    it('should return ok when both DB and Redis are responsive', async () => {
      const res = await controller.check();
      expect(res.status).toBe('ok');
      expect(res.checks).toEqual({ db: true, redis: true });
      expect(res.timestamp).toBeDefined();
    });

    it('should return degraded if DB is down', async () => {
      prisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('Connection timeout'));
      const res = await controller.check();
      expect(res.status).toBe('degraded');
      expect(res.checks).toEqual({ db: false, redis: true });
    });

    it('should return degraded if Redis is down', async () => {
      redis.set.mockRejectedValueOnce(new Error('Redis connection refused'));
      const res = await controller.check();
      expect(res.status).toBe('degraded');
      expect(res.checks).toEqual({ db: true, redis: false });
    });
  });

  describe('GET /health/live and /health/liveness (Liveness Probe)', () => {
    it('should return ok immediately without touching DB or Redis', () => {
      const res = controller.live();
      expect(res.status).toBe('ok');
      expect(res.timestamp).toBeDefined();
      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready and /health/readiness (Readiness Probe)', () => {
    it('should return ready when both DB and Redis are healthy', async () => {
      const res = await controller.ready();
      expect(res.status).toBe('ready');
      expect(res.checks).toEqual({ db: true, redis: true });
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
      expect(redis.set).toHaveBeenCalledWith('health_check', '1', 5);
    });

    it('should throw ServiceUnavailableException (503) if DB is down', async () => {
      prisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('DB unreachable'));

      await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException (503) if Redis is down', async () => {
      redis.set.mockRejectedValueOnce(new Error('Redis connection closed'));

      await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    });
  });
});

