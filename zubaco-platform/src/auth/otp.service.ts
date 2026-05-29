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

  async generateAndSend(phone: string): Promise<void> {
    // Rate limit: max 5 OTPs per phone per hour
    const rateLimitKey = `otp_rate:${phone}`;
    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.expire(rateLimitKey, 3600);
    }
    if (count > 5) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }

    // Generate OTP
    const otp = this.generateSecureOtp(config.otp.length);
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + config.otp.expirySeconds * 1000);

    // Store in DB
    await this.prisma.otpVerification.create({
      data: {
        phone,
        otp_hash: otpHash,
        expires_at: expiresAt,
      },
    });

    // Send OTP via SMS in production, log in dev
    if (config.app.env === 'development') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    } else {
      await this.smsService.send(phone, `Your Zubaco verification code is: ${otp}`);
    }
  }

  async verify(phone: string, otp: string): Promise<boolean> {
    // Global brute-force protection: lock phone after 10 failed attempts in 15 min
    const bruteForceKey = `otp_bruteforce:${phone}`;
    const failedAttempts = await this.redis.get(bruteForceKey);
    if (failedAttempts && parseInt(failedAttempts, 10) >= 10) {
      throw new BadRequestException('Too many failed attempts. Try again in 15 minutes.');
    }

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
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
    const digits = '0123456789';
    let otp = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      otp += digits[bytes[i] % 10];
    }
    return otp;
  }
}
