import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '.prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { user_id: userId } }),
      this.prisma.notification.count({ where: { user_id: userId, read: false } }),
    ]);

    return { notifications, total, unread_count: unreadCount, page };
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, user_id: userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  // ─── SEND NOTIFICATIONS (Used internally by other services) ────

  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
  ) {
    const notification = await this.prisma.notification.create({
      data: { user_id: userId, type, title, body, data },
    });

    // Push notification via device tokens
    await this.sendPushNotification(userId, title, body, data);

    return notification;
  }

  async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
  ) {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      body,
      data,
    }));

    await this.prisma.notification.createMany({ data: notifications });

    // Send push to all
    await Promise.allSettled(
      userIds.map((userId) => this.sendPushNotification(userId, title, body, data)),
    );
  }

  private async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    // Get user's device tokens
    const devices = await this.prisma.userDevice.findMany({
      where: { user_id: userId, push_token: { not: null } },
    });

    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.push_token!).filter(Boolean);
    if (tokens.length === 0) return;

    // Send via Firebase Cloud Messaging (HTTP v1 API)
    const fcmApiKey = process.env.FCM_SERVER_KEY;
    if (!fcmApiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PUSH] -> ${userId}: ${title} (no FCM key configured)`);
      }
      return;
    }

    try {
      const payload = {
        registration_ids: tokens,
        notification: { title, body },
        data: data || {},
        priority: 'high',
      };

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json() as any;

        // Mark notifications as push-sent
        await this.prisma.notification.updateMany({
          where: { user_id: userId, sent_push: false },
          data: { sent_push: true },
        });

        // Clean up invalid tokens
        if (result.results) {
          const invalidIndices: number[] = [];
          (result.results as any[]).forEach((r: any, i: number) => {
            if (r.error === 'NotRegistered' || r.error === 'InvalidRegistration') {
              invalidIndices.push(i);
            }
          });

          if (invalidIndices.length > 0) {
            const tokensToRemove = invalidIndices.map((i) => tokens[i]);
            await this.prisma.userDevice.updateMany({
              where: { push_token: { in: tokensToRemove } },
              data: { push_token: null },
            });
          }
        }
      }
    } catch (error) {
      // Silently fail push notifications (non-critical)
      console.error(`[PUSH] Failed for ${userId}:`, error);
    }
  }

  // ─── DEVICE TOKEN REGISTRATION ─────────────────────────────────

  async registerPushToken(userId: string, deviceId: string, pushToken: string, platform: 'ANDROID' | 'IOS') {
    await this.prisma.userDevice.upsert({
      where: { user_id_device_id: { user_id: userId, device_id: deviceId } },
      create: { user_id: userId, device_id: deviceId, push_token: pushToken, platform },
      update: { push_token: pushToken, last_active_at: new Date() },
    });
    return { success: true };
  }
}
