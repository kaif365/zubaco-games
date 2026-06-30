import { Injectable } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '.prisma/client';

@Injectable()
export class NotificationService {
  private fcmAuth: GoogleAuth | null = null;

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

    // Push notification via device tokens — scope the push-sent flag to this row.
    await this.sendPushNotification(userId, title, body, data, [notification.id]);

    return notification;
  }

  async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
  ) {
    if (userIds.length === 0) return;

    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      body,
      data,
    }));

    // Persist and capture each row's id so the push-sent flag is scoped to the
    // exact notification it was delivered for (not every unsent row of the user).
    const created = await this.prisma.notification.createManyAndReturn({
      data: notifications,
      select: { id: true, user_id: true },
    });

    // Send push per created notification
    await Promise.allSettled(
      created.map((row) => this.sendPushNotification(row.user_id, title, body, data, [row.id])),
    );
  }

  /**
   * Lazily build the FCM HTTP v1 OAuth2 credential from the service-account env
   * vars. Returns null when push is not configured (push is non-critical).
   */
  private getFcmAuth(): GoogleAuth | null {
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!clientEmail || !privateKey) return null;
    if (!this.fcmAuth) {
      this.fcmAuth = new GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
    }
    return this.fcmAuth;
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
    notificationIds: string[] = [],
  ) {
    // Get user's device tokens
    const devices = await this.prisma.userDevice.findMany({
      where: { user_id: userId, push_token: { not: null } },
    });

    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.push_token!).filter(Boolean);
    if (tokens.length === 0) return;

    // Send via Firebase Cloud Messaging (HTTP v1 API)
    const auth = this.getFcmAuth();
    const projectId = process.env.FCM_PROJECT_ID;
    if (!auth || !projectId) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PUSH] -> ${userId}: ${title} (FCM not configured)`);
      }
      return;
    }

    // FCM v1 requires every data value to be a string.
    const stringData: Record<string, string> = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] =
          value == null
            ? ''
            : typeof value === 'string'
              ? value
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
      }
    }

    let accessToken: string | null | undefined;
    try {
      accessToken = await auth.getAccessToken();
    } catch (error) {
      console.error(`[PUSH] Failed to obtain FCM access token for ${userId}:`, error);
      return;
    }
    if (!accessToken) return;

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const invalidTokens: string[] = [];
    let anyDelivered = false;

    // v1 delivers one message per token (the legacy multicast endpoint is gone).
    await Promise.allSettled(
      tokens.map(async (token) => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: stringData,
                android: { priority: 'high' },
              },
            }),
          });

          if (response.ok) {
            anyDelivered = true;
            return;
          }

          // Identify unregistered/invalid tokens for cleanup.
          const err = (await response.json().catch(() => null)) as any;
          const status = err?.error?.status;
          const code = err?.error?.details?.[0]?.errorCode;
          if (
            response.status === 404 ||
            status === 'NOT_FOUND' ||
            status === 'UNREGISTERED' ||
            code === 'UNREGISTERED' ||
            code === 'INVALID_ARGUMENT'
          ) {
            invalidTokens.push(token);
          }
        } catch (error) {
          console.error(`[PUSH] Send failed for ${userId}:`, error);
        }
      }),
    );

    // Mark only the notifications this push was for as push-sent.
    if (anyDelivered && notificationIds.length > 0) {
      await this.prisma.notification.updateMany({
        where: { id: { in: notificationIds }, sent_push: false },
        data: { sent_push: true },
      });
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await this.prisma.userDevice.updateMany({
        where: { push_token: { in: invalidTokens } },
        data: { push_token: null },
      });
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
