import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

type TargetAudience = 'ALL' | 'ACTIVE_SEASON' | 'ELIMINATED' | 'INACTIVE_7D';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendBulkNotification(
    target: TargetAudience,
    title: string,
    body: string,
    deepLink?: string,
    type?: string,
  ) {
    // Resolve target user IDs
    const userIds = await this.resolveTargetUsers(target);

    if (userIds.length === 0) {
      return { sent: 0, target, message: 'No users matched the target audience' };
    }

    // Create notification records in bulk
    const notificationType = (type as any) || 'SYSTEM';
    const data = deepLink ? { deep_link: deepLink } : undefined;

    await this.prisma.notification.createMany({
      data: userIds.map((user_id) => ({
        user_id,
        type: notificationType,
        title,
        body,
        data: data ?? undefined,
        read: false,
        sent_push: false,
      })),
    });

    // TODO: Integrate with FCM/APNs for actual push delivery
    // For now, notifications are stored and will be fetched by mobile app on next poll

    return {
      sent: userIds.length,
      target,
      title,
      message: `Notification queued for ${userIds.length} users`,
    };
  }

  async getHistory(page: number, limit: number) {
    const skip = (page - 1) * limit;

    // Get unique notification batches (grouped by title + created time window)
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { type: 'SYSTEM' },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
        distinct: ['title', 'body'],
        select: {
          id: true,
          title: true,
          body: true,
          type: true,
          data: true,
          created_at: true,
        },
      }),
      this.prisma.notification.count({ where: { type: 'SYSTEM' } }),
    ]);

    return { notifications, total, page, limit };
  }

  private async resolveTargetUsers(target: TargetAudience): Promise<string[]> {
    switch (target) {
      case 'ALL': {
        const users = await this.prisma.user.findMany({
          where: { deleted_at: null, is_banned: false },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }

      case 'ACTIVE_SEASON': {
        const entries = await this.prisma.seasonEntry.findMany({
          where: { status: 'ACTIVE' },
          select: { user_id: true },
          distinct: ['user_id'],
        });
        return entries.map((e) => e.user_id);
      }

      case 'ELIMINATED': {
        const entries = await this.prisma.seasonEntry.findMany({
          where: { status: 'ELIMINATED' },
          select: { user_id: true },
          distinct: ['user_id'],
        });
        return entries.map((e) => e.user_id);
      }

      case 'INACTIVE_7D': {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const users = await this.prisma.user.findMany({
          where: {
            deleted_at: null,
            is_banned: false,
            last_login_at: { lt: sevenDaysAgo },
          },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }

      default:
        return [];
    }
  }
}
