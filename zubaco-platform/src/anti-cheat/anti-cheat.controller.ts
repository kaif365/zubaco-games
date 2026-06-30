import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AntiCheatService } from './anti-cheat.service';
import { ServiceIdentityGuard } from '../auth/service-identity/service-identity.guard';
import { CheatSeverity } from '.prisma/client';

@Controller('anti-cheat')
@UseGuards(ServiceIdentityGuard)
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
    @Req() req: any,
    @Param('id') flagId: string,
    @Body() body: { action: 'dismiss' | 'warn' | 'ban' },
  ) {
    // Actor is the authenticated calling service (ServiceIdentityGuard sets
    // req.serviceIdentity), never a spoofable body field.
    const actor = (req?.serviceIdentity as string) ?? 'service:unknown';
    return this.antiCheatService.reviewFlag(flagId, actor, body.action);
  }

  @Get('users/:userId/flags')
  async getUserFlags(@Param('userId') userId: string) {
    return this.antiCheatService.getUserFlags(userId);
  }

  @Post('users/:userId/ban')
  async banUser(@Req() req: any, @Param('userId') userId: string, @Body() body: { reason: string }) {
    const actor = (req?.serviceIdentity as string) ?? 'service:unknown';
    return this.antiCheatService.banUser(userId, body.reason, actor);
  }

  @Post('users/:userId/unban')
  async unbanUser(@Req() req: any, @Param('userId') userId: string) {
    // Actor is the authenticated calling service (ServiceIdentityGuard sets
    // req.serviceIdentity), never a spoofable body field.
    const actor = (req?.serviceIdentity as string) ?? 'service:unknown';
    return this.antiCheatService.unbanUser(userId, actor);
  }
}
