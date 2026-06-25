import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform } from 'react-native';
import { api } from './api';
import { secureStorage } from './secureStorage';

const PUSH_TOKEN_KEY = 'push_token_registered';

/**
 * Push Notification Service
 * Handles FCM token registration, channel setup, and local notifications.
 */
class PushNotificationService {
  private initialized = false;

  /** Initialize push notifications — call once on app start */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    PushNotification.configure({
      onRegister: (tokenData) => {
        this.registerTokenWithServer(tokenData.token, tokenData.os);
      },

      onNotification: (notification) => {
        // Handle notification tap
        if (notification.userInteraction) {
          this.handleNotificationTap(notification.data);
        }

        // Required on iOS
        if (Platform.OS === 'ios') {
          notification.finish('backgroundFetchResultNoData');
        }
      },

      onAction: (notification) => {
        // Handle notification action button taps
        if (notification.action === 'Play Now') {
          this.handleNotificationTap(notification.data);
        }
      },

      // Android: Request permissions automatically
      requestPermissions: Platform.OS === 'ios',
      permissions: { alert: true, badge: true, sound: true },
      popInitialNotification: true,
    });

    this.createChannels();
  }

  /** Create notification channels (Android) */
  private createChannels(): void {
    if (Platform.OS !== 'android') return;

    PushNotification.createChannel(
      {
        channelId: 'game-updates',
        channelName: 'Game Updates',
        channelDescription: 'Tournament starts, game results, and rewards',
        importance: Importance.HIGH,
        vibrate: true,
        playSound: true,
      },
      () => {},
    );

    PushNotification.createChannel(
      {
        channelId: 'social',
        channelName: 'Social',
        channelDescription: 'Friend requests, challenges, and referrals',
        importance: Importance.DEFAULT,
        vibrate: true,
        playSound: true,
      },
      () => {},
    );

    PushNotification.createChannel(
      {
        channelId: 'wallet',
        channelName: 'Wallet & Payments',
        channelDescription: 'Deposits, withdrawals, and rewards',
        importance: Importance.HIGH,
        vibrate: true,
        playSound: true,
      },
      () => {},
    );

    PushNotification.createChannel(
      {
        channelId: 'reminders',
        channelName: 'Reminders',
        channelDescription: 'Daily challenges and energy refill reminders',
        importance: Importance.LOW,
        vibrate: false,
        playSound: false,
      },
      () => {},
    );
  }

  /** Register push token with backend */
  private async registerTokenWithServer(token: string, platform: string): Promise<void> {
    try {
      // Check if we already registered this token
      const existingToken = await secureStorage.get(PUSH_TOKEN_KEY);
      if (existingToken === token) return;

      await api.registerPushToken(token, platform === 'ios' ? 'ios' : 'android');
      await secureStorage.set(PUSH_TOKEN_KEY, token);
    } catch {
      // Will retry on next app launch
    }
  }

  /** Handle notification tap — navigate to relevant screen */
  private handleNotificationTap(data: Record<string, unknown>): void {
    // Navigation is handled by the app's deep link handler
    // Data contains: { screen, params }
    // The RootNavigator's linking config handles navigation
    const deepLink = data?.deepLink as string | undefined;
    if (deepLink) {
      // Linking.openURL will be handled by navigation's linking config
      import('react-native').then(({ Linking }) => {
        Linking.openURL(`zubaco://${deepLink}`);
      });
    }
  }

  /** Request permission (iOS — Android auto-grants) */
  async requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.requestPermissions().then((result) => {
        resolve(!!(result && (result as { alert?: boolean }).alert));
      });
    });
  }

  /** Check if permissions are granted */
  async checkPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((permissions) => {
        resolve(!!permissions.alert);
      });
    });
  }

  /** Show a local notification */
  showLocal(title: string, message: string, channelId = 'game-updates'): void {
    PushNotification.localNotification({
      channelId,
      title,
      message,
      playSound: true,
      vibrate: true,
      smallIcon: 'ic_notification',
      largeIcon: 'ic_launcher',
    });
  }

  /** Schedule a local notification */
  scheduleLocal(
    title: string,
    message: string,
    date: Date,
    channelId = 'reminders',
    id = Math.floor(Math.random() * 10000).toString(),
  ): void {
    PushNotification.localNotificationSchedule({
      id,
      channelId,
      title,
      message,
      date,
      playSound: true,
      allowWhileIdle: true,
    });
  }

  /** Cancel all scheduled notifications */
  cancelAll(): void {
    PushNotification.cancelAllLocalNotifications();
  }

  /** Clear badge count (iOS) */
  clearBadge(): void {
    PushNotification.setApplicationIconBadgeNumber(0);
  }

  /** Re-register token (e.g., after login) */
  async refreshToken(): Promise<void> {
    await secureStorage.remove(PUSH_TOKEN_KEY);
    // Force re-registration by restarting push listener
    PushNotification.requestPermissions();
  }
}

export const pushNotificationService = new PushNotificationService();
