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
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
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
  async appleLogin(@Body() dto: AppleLoginDto) {
    return this.authService.appleLoginWithToken(dto.identity_token, dto.name);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refresh_token);
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
    @Body() dto: { provider: 'google' | 'apple' | 'phone'; provider_id?: string; phone?: string; email?: string },
  ) {
    return this.authService.linkAccount(userId, dto);
  }
}
