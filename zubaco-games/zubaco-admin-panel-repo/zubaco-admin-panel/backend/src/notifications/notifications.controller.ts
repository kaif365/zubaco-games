import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { NotificationsService } from './notifications.service';

interface SendNotificationDto {
  target: 'ALL' | 'ACTIVE_SEASON' | 'ELIMINATED' | 'INACTIVE_7D';
  title: string;
  body: string;
  deep_link?: string;
  type?: string;
}

@ApiTags('Admin Notifications')
@ApiBearerAuth('authorization')
@RequireSession({
  tokenTypes: [TOKEN_TYPES.LOGIN],
  userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendBulkNotification(dto.target, dto.title, dto.body, dto.deep_link, dto.type);
  }

  @Get('history')
  async getHistory(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationsService.getHistory(parseInt(page || '1'), parseInt(limit || '20'));
  }
}
