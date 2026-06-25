import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { LinkAccountDto } from './dto/link-account.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 per minute
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 per minute
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpAndLogin(dto.phone, dto.otp, dto.device_id);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLoginWithToken(dto.id_token);
  }

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async appleLogin(@Body() dto: AppleLoginDto) {
    return this.authService.appleLoginWithToken(dto.identity_token, dto.name);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() userId: string, @Body() dto: RefreshTokenDto) {
    await this.authService.logout(userId, dto.refresh_token);
    return { message: 'Logged out' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() userId: string) {
    await this.authService.logoutAll(userId);
    return { message: 'All sessions revoked' };
  }

  @Post('link-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async linkAccount(
    @CurrentUser() userId: string,
    @Body() dto: LinkAccountDto,
  ) {
    return this.authService.linkAccount(userId, dto);
  }

  /**
   * Internal endpoint: Verify a platform access token and return the userId.
   * Used by game backends to validate tokens injected via WebView.
   * Protected by API key (not user JWT).
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Body() dto: { token: string },
    @Req() req: any,
  ) {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (!expectedKey || !timingSafeEqualStr(apiKey, expectedKey)) {
      return { valid: false, userId: null };
    }

    const result = this.authService.verifyAccessToken(dto.token);
    if (!result) {
      return { valid: false, userId: null };
    }
    return { valid: true, userId: result.userId };
  }
}

/**
 * Constant-time comparison of two strings to avoid leaking the secret via timing.
 * Returns false on any length mismatch or non-string input.
 */
function timingSafeEqualStr(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
