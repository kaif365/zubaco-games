import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { SmsService } from './sms.service';
import * as bcrypt from 'bcrypt';

describe('OtpService', () => {
  let service: OtpService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockSms: any;
  let redisStore: Map<string, string>;

  beforeEach(() => {
    redisStore = new Map();

    mockPrisma = {
      otpVerification: {
        create: jest.fn().mockResolvedValue({ id: 'otp-rec-1' }),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'otp-rec-1' }),
      },
    };

    mockRedis = {
      get: jest.fn(async (key: string) => redisStore.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        redisStore.set(key, val);
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
      }),
      incr: jest.fn(async (key: string) => {
        const val = parseInt(redisStore.get(key) || '0', 10) + 1;
        redisStore.set(key, val.toString());
        return val;
      }),
      expire: jest.fn().mockResolvedValue(true),
    };

    mockSms = {
      send: jest.fn().mockResolvedValue(true),
    };

    service = new OtpService(
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
      mockSms as unknown as SmsService,
    );
  });

  describe('Indian Phone Normalization (+91)', () => {
    it('normalizes 10-digit mobile starting with 6, 7, 8, or 9', () => {
      expect(service.normalizeIndianPhone('9876543210')).toBe('+919876543210');
      expect(service.normalizeIndianPhone('8123456789')).toBe('+918123456789');
      expect(service.normalizeIndianPhone('7000000000')).toBe('+917000000000');
      expect(service.normalizeIndianPhone('6999999999')).toBe('+916999999999');
    });

    it('normalizes numbers already containing +91 or 91 or leading 0', () => {
      expect(service.normalizeIndianPhone('+919876543210')).toBe('+919876543210');
      expect(service.normalizeIndianPhone('919876543210')).toBe('+919876543210');
      expect(service.normalizeIndianPhone('09876543210')).toBe('+919876543210');
    });

    it('strips formatting like spaces, hyphens, parentheses', () => {
      expect(service.normalizeIndianPhone('+91 98765-43210')).toBe('+919876543210');
      expect(service.normalizeIndianPhone('(987) 654-3210')).toBe('+919876543210');
    });

    it('rejects invalid numbers or numbers starting with invalid digits (e.g. 1-5)', () => {
      expect(() => service.normalizeIndianPhone('5551234567')).toThrow(BadRequestException);
      expect(() => service.normalizeIndianPhone('1234567890')).toThrow(BadRequestException);
      expect(() => service.normalizeIndianPhone('98765')).toThrow(BadRequestException);
      expect(() => service.normalizeIndianPhone('')).toThrow(BadRequestException);
      expect(() => service.normalizeIndianPhone('not-a-number')).toThrow(BadRequestException);
    });
  });

  describe('OTP Rate-Limiting (max 3 per 10 minutes)', () => {
    it('allows up to 3 OTP requests within the 10-minute window and sets TTL to 600s', async () => {
      const phone = '9876543210';
      const normalized = '+919876543210';

      await service.generateAndSend(phone);
      expect(mockRedis.incr).toHaveBeenCalledWith(`otp_rate:${normalized}`);
      expect(mockRedis.expire).toHaveBeenCalledWith(`otp_rate:${normalized}`, 600);

      await service.generateAndSend(phone);
      await service.generateAndSend(phone);

      // Exactly 3 calls should have recorded verification and sent SMS
      expect(mockPrisma.otpVerification.create).toHaveBeenCalledTimes(3);
    });

    it('blocks the 4th OTP request within 10 minutes with BadRequestException', async () => {
      const phone = '9876543210';

      await service.generateAndSend(phone);
      await service.generateAndSend(phone);
      await service.generateAndSend(phone);

      await expect(service.generateAndSend(phone)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.otpVerification.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('OTP Verification & Brute-Force Protection', () => {
    it('successfully verifies a valid OTP and resets brute force counter', async () => {
      const phone = '9876543210';
      const otp = '123456';
      const otpHash = await bcrypt.hash(otp, 10);

      mockPrisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-rec-1',
        phone: '+919876543210',
        otp_hash: otpHash,
        attempts: 0,
        verified: false,
        expires_at: new Date(Date.now() + 300000),
      });

      const result = await service.verify(phone, otp);
      expect(result).toBe(true);
      expect(mockPrisma.otpVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp-rec-1' },
        data: { verified: true },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('otp_bruteforce:+919876543210');
    });

    it('rejects wrong OTP and increments attempts', async () => {
      const phone = '9876543210';
      const otpHash = await bcrypt.hash('123456', 10);

      mockPrisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-rec-1',
        phone: '+919876543210',
        otp_hash: otpHash,
        attempts: 1,
        verified: false,
        expires_at: new Date(Date.now() + 300000),
      });

      const result = await service.verify(phone, '999999');
      expect(result).toBe(false);
      expect(mockPrisma.otpVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp-rec-1' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('locks out verification if 10 failed attempts reached in 15 minutes', async () => {
      const phone = '9876543210';
      redisStore.set('otp_bruteforce:+919876543210', '10');

      await expect(service.verify(phone, '123456')).rejects.toThrow(
        /Too many failed attempts/,
      );
    });
  });
});
