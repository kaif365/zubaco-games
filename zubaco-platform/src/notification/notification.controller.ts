import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @CurrentUser() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getNotifications(userId, page || 1, limit || 20);
  }

  @Post(':id/read')
  async markAsRead(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notificationService.markAsRead(userId, id);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() userId: string) {
    return this.notificationService.markAllRead(userId);
  }

  @Post('push-token')
  async registerPushToken(
    @CurrentUser() userId: string,
    @Body() body: { device_id: string; push_token: string; platform: 'ANDROID' | 'IOS' },
  ) {
    return this.notificationService.registerPushToken(userId, body.device_id, body.push_token, body.platform);
  }
}
