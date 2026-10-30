/* eslint-disable @typescript-eslint/no-var-requires */
let getFirebaseAnalytics: (() => any) | null = null;
try {
  getFirebaseAnalytics = require('@react-native-firebase/analytics').default;
} catch {
  getFirebaseAnalytics = null;
}
/* eslint-enable @typescript-eslint/no-var-requires */

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

export const analyticsService = {
  async trackEvent(name: string, params?: Record<string, any>): Promise<void> {
    try {
      if (isDev || !getFirebaseAnalytics) {
        console.log('[Analytics] trackEvent:', name, params);
        return;
      }
      await getFirebaseAnalytics().logEvent(name, params);
    } catch (error) {
      console.warn('[Analytics] trackEvent failed:', error);
    }
  },

  async setUserId(id: string): Promise<void> {
    try {
      if (isDev || !getFirebaseAnalytics) {
        console.log('[Analytics] setUserId:', id);
        return;
      }
      await getFirebaseAnalytics().setUserId(id);
    } catch (error) {
      console.warn('[Analytics] setUserId failed:', error);
    }
  },

  async setUserProperty(key: string, value: string): Promise<void> {
    try {
      if (isDev || !getFirebaseAnalytics) {
        console.log('[Analytics] setUserProperty:', key, value);
        return;
      }
      await getFirebaseAnalytics().setUserProperty(key, value);
    } catch (error) {
      console.warn('[Analytics] setUserProperty failed:', error);
    }
  },

  async trackScreen(name: string): Promise<void> {
    try {
      if (isDev || !getFirebaseAnalytics) {
        console.log('[Analytics] trackScreen:', name);
        return;
      }
      await getFirebaseAnalytics().logScreenView({ screen_name: name });
    } catch (error) {
      console.warn('[Analytics] trackScreen failed:', error);
    }
  },
};
