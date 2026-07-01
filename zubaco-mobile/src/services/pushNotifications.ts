import { Platform } from 'react-native';
import { api, DevicePlatform } from './api';
import { track, AnalyticsEvent } from './analyticsEvents';
import { addBreadcrumb, captureException } from './crashReporting';
import { navigate } from '../navigation/navigationRef';

// Push notification integration built on react-native-push-notification (already
// a project dependency), which bridges FCM (Android) and APNS (iOS). The native
// module is loaded through a guarded require so the JS bundle degrades
// gracefully if the native side is unavailable.

/* eslint-disable @typescript-eslint/no-var-requires */
let PushNotification: any = null;
let DeviceInfo: any = null;
try {
  PushNotification = require('react-native-push-notification').default ?? require('react-native-push-notification');
} catch {
  PushNotification = null;
}
try {
  DeviceInfo = require('react-native-device-info').default ?? require('react-native-device-info');
} catch {
  DeviceInfo = null;
}
/* eslint-enable @typescript-eslint/no-var-requires */

function platform(): DevicePlatform {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

async function deviceId(): Promise<string> {
  try {
    if (DeviceInfo?.getUniqueId) {
      const id = await DeviceInfo.getUniqueId();
      return String(id);
    }
  } catch {
    // fall through
  }
  return `${Platform.OS}-unknown-device`;
}

// Route a tapped notification to the right screen using its data payload.
function handleDeepLink(data: Record<string, any> | undefined): void {
  if (!data) {
    navigate('Notifications');
    return;
  }
  const type = String(data.type || '').toUpperCase();
  switch (type) {
    case 'WALLET':
    case 'DEPOSIT':
    case 'WITHDRAWAL':
    case 'PRIZE_WIN':
      navigate('Wallet');
      break;
    case 'REFERRAL':
      navigate('Referral');
      break;
    case 'TOURNAMENT':
    case 'SEASON':
      navigate('MainTabs');
      break;
    default:
      navigate('Notifications');
  }
}

let lastToken: string | null = null;
let configured = false;

export const pushNotifications = {
  /** One-time setup at app launch. Wires token + foreground/tap handlers. */
  configure(): void {
    if (configured || !PushNotification) return;
    configured = true;
    try {
      PushNotification.configure({
        onRegister: ({ token }: { token: string }) => {
          lastToken = token;
          addBreadcrumb('push token received', 'push');
          // Registration with the backend requires auth; retry silently in case
          // the user is already signed in when the token arrives.
          this.registerToken().catch(() => {});
        },
        onNotification: (notification: any) => {
          if (notification?.userInteraction) {
            track.event(AnalyticsEvent.PUSH_OPENED, { type: notification?.data?.type }).catch(() => {});
            handleDeepLink(notification?.data);
          } else {
            track.event(AnalyticsEvent.PUSH_RECEIVED, { type: notification?.data?.type }).catch(() => {});
          }
          // Required on iOS to signal the OS the fetch handler completed.
          notification?.finish?.('UIBackgroundFetchResultNoData');
        },
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });
    } catch (error) {
      captureException(error);
    }
  },

  /** Send the current device push token to the backend (auth required). */
  async registerToken(): Promise<void> {
    if (!lastToken) return;
    try {
      const id = await deviceId();
      await api.registerPushToken(id, lastToken, platform());
      await track.event(AnalyticsEvent.PUSH_TOKEN_REGISTERED, { platform: platform() });
    } catch (error) {
      // Non-fatal: the backend will simply not target this device this session.
      addBreadcrumb('push token registration failed', 'push');
    }
  },

  /** Best-effort local cleanup on logout. */
  clear(): void {
    lastToken = null;
  },
};
