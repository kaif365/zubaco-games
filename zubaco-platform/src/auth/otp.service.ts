import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { SmsService } from './sms.service';
import { config } from '../config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Normalizes and validates Indian 10-digit mobile numbers (+91).
   * Valid formats accepted:
   * - 9876543210 (10 digits starting with 6-9)
   * - +919876543210
   * - 919876543210
   * - 09876543210
   * Returns canonical format: +91XXXXXXXXXX
   */
  normalizeIndianPhone(rawPhone: string): string {
    if (!rawPhone || typeof rawPhone !== 'string') {
      throw new BadRequestException('Phone number is required');
    }
    let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleaned)) {
      throw new BadRequestException(
        'Invalid Indian mobile number. Must be a valid 10-digit number starting with 6, 7, 8, or 9.',
      );
    }

    return `+91${cleaned}`;
  }

  normalizePhone(phone: string): string {
    return this.normalizeIndianPhone(phone);
  }

  async generateAndSend(phone: string): Promise<void> {
    const normalizedPhone = this.normalizeIndianPhone(phone);

    // Rate limit: max 3 OTPs per phone per 10 minutes (600s)
    const rateLimitKey = `otp_rate:${normalizedPhone}`;
    const limit = config.otp.rateLimitMax || 3;
    const windowSeconds = config.otp.rateLimitWindowSeconds || 600;

    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.expire(rateLimitKey, windowSeconds);
    }
    if (count > limit) {
      throw new BadRequestException(
        `Too many OTP requests. Maximum ${limit} requests allowed per ${Math.round(windowSeconds / 60)} minutes.`,
      );
    }

    // Generate OTP
    const otp = this.generateSecureOtp(config.otp.length);
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + config.otp.expirySeconds * 1000);

    // Store in DB
    await this.prisma.otpVerification.create({
      data: {
        phone: normalizedPhone,
        otp_hash: otpHash,
        expires_at: expiresAt,
      },
    });

    // Send OTP via SMS in production, log in dev
    if (config.app.env === 'development') {
      console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
    } else {
      await this.smsService.send(normalizedPhone, `Your Zubaco verification code is: ${otp}`);
    }
  }

  async verify(phone: string, otp: string): Promise<boolean> {
    const normalizedPhone = this.normalizeIndianPhone(phone);

    // Global brute-force protection: lock phone after 10 failed attempts in 15 min
    const bruteForceKey = `otp_bruteforce:${normalizedPhone}`;
    const failedAttempts = await this.redis.get(bruteForceKey);
    if (failedAttempts && parseInt(failedAttempts, 10) >= 10) {
      throw new BadRequestException('Too many failed attempts. Try again in 15 minutes.');
    }

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: normalizedPhone,
        verified: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!record) {
      await this.incrementBruteForce(bruteForceKey);
      return false;
    }

    // Check max attempts on this specific OTP record
    if (record.attempts >= config.otp.maxAttempts) {
      throw new BadRequestException('Maximum OTP attempts exceeded. Request a new one.');
    }

    // Increment attempts
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const isValid = await bcrypt.compare(otp, record.otp_hash);

    if (isValid) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { verified: true },
      });
      // Reset brute-force counter on success
      await this.redis.del(bruteForceKey);
      return true;
    }

    await this.incrementBruteForce(bruteForceKey);
    return false;
  }

  private async incrementBruteForce(key: string): Promise<void> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 900); // 15 minutes
    }
  }

  private generateSecureOtp(length: number): string {
    // SEC-S1 (F4): reject bytes >= 250 so every accepted byte maps uniformly
    // onto 0-9 (250 = 25*10). Plain `byte % 10` biases digits 0-5 because 256
    // is not a multiple of 10 (CWE-331 insufficient randomness).
    const digits = '0123456789';
    let otp = '';
    while (otp.length < length) {
      const byte = crypto.randomBytes(1)[0];
      if (byte >= 250) continue;
      otp += digits[byte % 10];
    }
    return otp;
  }
}
