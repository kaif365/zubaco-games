import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { FreePlayService } from './free-play.service';
import { EnergyService } from './energy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StartLevelDto } from './dto/start-level.dto';
import { SubmitResultDto } from './dto/submit-result.dto';
import { GameType } from '.prisma/client';

@Controller('free-play')
@UseGuards(JwtAuthGuard)
export class FreePlayController {
  constructor(
    private readonly freePlayService: FreePlayService,
    private readonly energyService: EnergyService,
  ) {}

  @Get('energy')
  async getEnergy(@CurrentUser() userId: string) {
    return this.energyService.getEnergy(userId);
  }

  @Post('energy/refill')
  async refillEnergy(@CurrentUser() userId: string) {
    await this.energyService.refillLives(userId);
    return this.energyService.getEnergy(userId);
  }

  @Get('progress')
  async getAllProgress(@CurrentUser() userId: string) {
    return this.freePlayService.getAllProgress(userId);
  }

  @Get('progress/:gameType')
  async getGameProgress(@CurrentUser() userId: string, @Param('gameType') gameType: GameType) {
    return this.freePlayService.getGameProgress(userId, gameType);
  }

  @Get('config/:gameType/:level')
  async getLevelConfig(@Param('gameType') gameType: GameType, @Param('level') level: number) {
    return this.freePlayService.getLevelConfig(gameType, level);
  }

  @Post('start')
  async startLevel(@CurrentUser() userId: string, @Body() dto: StartLevelDto, @Req() req: any) {
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const deviceFingerprint = req.headers['x-device-fingerprint'] || undefined;
    return this.freePlayService.startLevel(userId, dto.game_type, dto.level, dto.client_seed, {
      ipAddress,
      deviceFingerprint,
      deviceComponents: dto.device_components,
    });
  }

  @Post('submit')
  async submitResult(@CurrentUser() userId: string, @Body() dto: SubmitResultDto) {
    return this.freePlayService.submitResult(
      userId,
      dto.session_id,
      dto.score,
      dto.duration_ms,
      dto.metadata,
    );
  }
}
