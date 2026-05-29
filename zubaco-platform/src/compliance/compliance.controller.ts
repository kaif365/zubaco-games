import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AgeVerificationService } from './age-verification.service';
import { TdsService } from './tds.service';
import { GstService } from './gst.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { isStateBanned } from './geo-fencing.guard';
import { IsDateString, IsString, IsNotEmpty, Length } from 'class-validator';

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

@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly ageService: AgeVerificationService,
    private readonly tdsService: TdsService,
    private readonly gstService: GstService,
    private readonly prisma: PrismaService,
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
}
