import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AntiCheatService } from './anti-cheat.service';
import { InternalApiGuard } from '../auth/guards/internal-api.guard';
import { CheatSeverity } from '.prisma/client';

@Controller('anti-cheat')
@UseGuards(InternalApiGuard)
export class AntiCheatController {
  constructor(private readonly antiCheatService: AntiCheatService) {}

  // ─── ADMIN ENDPOINTS ───────────────────────────────────────────

  @Get('flags')
  async getFlagQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('severity') severity?: CheatSeverity,
    @Query('reviewed') reviewed?: string,
  ) {
    return this.antiCheatService.getFlagQueue({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      severity,
      reviewed: reviewed !== undefined ? reviewed === 'true' : undefined,
    });
  }

  @Post('flags/:id/review')
  async reviewFlag(
    @Param('id') flagId: string,
    @Body() body: { action: 'dismiss' | 'warn' | 'ban'; admin_id: string },
  ) {
    return this.antiCheatService.reviewFlag(flagId, body.admin_id, body.action);
  }

  @Get('users/:userId/flags')
  async getUserFlags(@Param('userId') userId: string) {
    return this.antiCheatService.getUserFlags(userId);
  }

  @Post('users/:userId/ban')
  async banUser(@Param('userId') userId: string, @Body() body: { reason: string }) {
    return this.antiCheatService.banUser(userId, body.reason);
  }

  @Post('users/:userId/unban')
  async unbanUser(@Param('userId') userId: string) {
    return this.antiCheatService.unbanUser(userId);
  }
}
