import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AgeVerificationService } from './age-verification.service';
import { TdsService } from './tds.service';
import { GstService } from './gst.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { isStateBanned } from './geo-fencing.guard';
import { IsDateString, IsString, IsNotEmpty, Length, IsNumber, IsOptional, Min, Max } from 'class-validator';

class VerifyAgeDto {
  @IsDateString()
  date_of_birth: string;
}

class UpdateStateDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  state: string; // 2-letter state code
}

class SetDepositLimitDto {
  @IsNumber()
  @Min(0)
  @Max(1000000) // ₹10 lakh max
  daily_limit: number;

  @IsNumber()
  @Min(0)
  @Max(5000000)
  weekly_limit: number;

  @IsNumber()
  @Min(0)
  @Max(20000000)
  monthly_limit: number;
}

class SetSessionAlertDto {
  @IsNumber()
  @Min(15)
  @Max(480) // 15 min to 8 hours
  alert_after_minutes: number;
}

class SelfExcludeDto {
  @IsNumber()
  @Min(1)
  @Max(365) // 1 day to 1 year
  days: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly ageService: AgeVerificationService,
    private readonly tdsService: TdsService,
    private readonly gstService: GstService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── AGE VERIFICATION ──────────────────────────────────────────

  @Post('verify-age')
  @UseGuards(JwtAuthGuard)
  async verifyAge(@CurrentUser() userId: string, @Body() dto: VerifyAgeDto) {
    return this.ageService.verifyAge(userId, new Date(dto.date_of_birth));
  }

  // ─── STATE UPDATE (for geo-fencing) ────────────────────────────

  @Post('update-state')
  @UseGuards(JwtAuthGuard)
  async updateState(@CurrentUser() userId: string, @Body() dto: UpdateStateDto) {
    const banned = isStateBanned(dto.state);

    await this.prisma.user.update({
      where: { id: userId },
      data: { state: dto.state.toUpperCase() },
    });

    return {
      state: dto.state.toUpperCase(),
      paid_features_available: !banned,
      message: banned
        ? 'Real-money features are not available in your state due to local regulations. Free-play is still available.'
        : 'State updated successfully. All features are available.',
    };
  }

  // ─── TDS INFORMATION ───────────────────────────────────────────

  @Get('tds-summary')
  @UseGuards(JwtAuthGuard)
  async getTdsSummary(@CurrentUser() userId: string) {
    return this.tdsService.getTdsSummary(userId);
  }

  // ─── GST BREAKDOWN ─────────────────────────────────────────────

  @Get('gst-info')
  async getGstInfo() {
    return {
      rate: '28%',
      description: 'GST at 28% is applicable on the full face value of entry fees for online gaming as per GST Council ruling (October 2023).',
      example: this.gstService.getGstBreakdown(100),
    };
  }

  // ─── CONSENT ───────────────────────────────────────────────────

  @Post('accept-terms')
  @UseGuards(JwtAuthGuard)
  async acceptTerms(@CurrentUser() userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { terms_accepted_at: new Date() },
    });
    return { accepted: true, type: 'terms', timestamp: new Date().toISOString() };
  }

  @Post('accept-privacy')
  @UseGuards(JwtAuthGuard)
  async acceptPrivacy(@CurrentUser() userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { privacy_accepted_at: new Date() },
    });
    return { accepted: true, type: 'privacy', timestamp: new Date().toISOString() };
  }

  // ═══════════════════════════════════════════════════════════════
  // RESPONSIBLE GAMING (RBI/MeitY Compliance)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get user's responsible gaming settings (deposit limits, session alerts, self-exclusion status).
   */
  @Get('responsible-gaming')
  @UseGuards(JwtAuthGuard)
  async getResponsibleGamingSettings(@CurrentUser() userId: string) {
    const depositLimit = await this.redis.get(`deposit_limit:${userId}`);
    const sessionAlert = await this.redis.get(`session_alert:${userId}`);
    const selfExclusion = await this.redis.get(`self_exclude:${userId}`);

    return {
      deposit_limits: depositLimit ? JSON.parse(depositLimit) : { daily_limit: 0, weekly_limit: 0, monthly_limit: 0, enabled: false },
      session_alert: sessionAlert ? JSON.parse(sessionAlert) : { alert_after_minutes: 0, enabled: false },
      self_exclusion: selfExclusion ? JSON.parse(selfExclusion) : { active: false },
    };
  }

  /**
   * Set deposit limits. Once set, limits can only be REDUCED immediately.
   * Increasing limits requires a 24-hour cooling-off period.
   */
  @Post('responsible-gaming/deposit-limits')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 changes per hour
  async setDepositLimits(@CurrentUser() userId: string, @Body() dto: SetDepositLimitDto) {
    const key = `deposit_limit:${userId}`;
    const existing = await this.redis.get(key);
    const current = existing ? JSON.parse(existing) : null;

    // If increasing limits, enforce 24h cooling-off
    if (current && current.enabled) {
      const isIncrease = dto.daily_limit > current.daily_limit ||
        dto.weekly_limit > current.weekly_limit ||
        dto.monthly_limit > current.monthly_limit;

      if (isIncrease) {
        // Store pending increase — will activate after 24h
        const pendingKey = `deposit_limit_pending:${userId}`;
        await this.redis.set(pendingKey, JSON.stringify({
          ...dto,
          enabled: true,
          requested_at: new Date().toISOString(),
          activates_at: new Date(Date.now() + 86400000).toISOString(),
        }), 86400);

        return {
          status: 'pending',
          message: 'Limit increase will take effect after 24-hour cooling-off period',
          activates_at: new Date(Date.now() + 86400000).toISOString(),
          current_limits: current,
        };
      }
    }

    // Decreases or first-time setup: apply immediately
    const limits = { ...dto, enabled: true, updated_at: new Date().toISOString() };
    await this.redis.set(key, JSON.stringify(limits)); // No TTL — permanent until changed

    return { status: 'active', limits };
  }

  /**
   * Remove deposit limits (24h cooling-off period applies).
   */
  @Post('responsible-gaming/deposit-limits/remove')
  @UseGuards(JwtAuthGuard)
  async removeDepositLimits(@CurrentUser() userId: string) {
    const pendingKey = `deposit_limit_removal:${userId}`;
    await this.redis.set(pendingKey, JSON.stringify({
      requested_at: new Date().toISOString(),
      removes_at: new Date(Date.now() + 86400000).toISOString(),
    }), 86400);

    return {
      status: 'pending',
      message: 'Deposit limits will be removed after 24-hour cooling-off period',
      removes_at: new Date(Date.now() + 86400000).toISOString(),
    };
  }

  /**
   * Set session time alert. User will be notified after N minutes of continuous play.
   */
  @Post('responsible-gaming/session-alert')
  @UseGuards(JwtAuthGuard)
  async setSessionAlert(@CurrentUser() userId: string, @Body() dto: SetSessionAlertDto) {
    const key = `session_alert:${userId}`;
    const alert = { alert_after_minutes: dto.alert_after_minutes, enabled: true, updated_at: new Date().toISOString() };
    await this.redis.set(key, JSON.stringify(alert));

    return { status: 'active', alert };
  }

  /**
   * Disable session time alert.
   */
  @Post('responsible-gaming/session-alert/disable')
  @UseGuards(JwtAuthGuard)
  async disableSessionAlert(@CurrentUser() userId: string) {
    await this.redis.del(`session_alert:${userId}`);
    return { status: 'disabled' };
  }

  /**
   * Self-exclusion: User voluntarily locks themselves out for N days.
   * CANNOT be reversed before the exclusion period ends.
   */
  @Post('responsible-gaming/self-exclude')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 1, ttl: 86400000 } }) // Once per day
  async selfExclude(@CurrentUser() userId: string, @Body() dto: SelfExcludeDto) {
    const key = `self_exclude:${userId}`;
    const ttlSeconds = dto.days * 86400;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const exclusion = {
      active: true,
      days: dto.days,
      reason: dto.reason || 'User-initiated',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    await this.redis.set(key, JSON.stringify(exclusion), ttlSeconds);

    // Also ban the user for the exclusion period (prevents playing)
    await this.prisma.user.update({
      where: { id: userId },
      data: { is_banned: true, ban_reason: `Self-exclusion: ${dto.days} days (expires ${expiresAt.toISOString()})` },
    });

    return {
      status: 'active',
      message: `You have been self-excluded for ${dto.days} days. This cannot be reversed.`,
      expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Check if user's self-exclusion has expired (called on login attempt).
   */
  @Get('responsible-gaming/self-exclude/status')
  @UseGuards(JwtAuthGuard)
  async getSelfExclusionStatus(@CurrentUser() userId: string) {
    const key = `self_exclude:${userId}`;
    const exclusion = await this.redis.get(key);

    if (!exclusion) {
      // If user was self-excluded but period expired, auto-unban
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { is_banned: true, ban_reason: true },
      });

      if (user?.is_banned && user?.ban_reason?.startsWith('Self-exclusion:')) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { is_banned: false, ban_reason: null },
        });
        return { active: false, message: 'Self-exclusion period has ended. Welcome back.' };
      }

      return { active: false };
    }

    return { active: true, ...JSON.parse(exclusion) };
  }
}
