import analytics from '@react-native-firebase/analytics';

const __DEV__ = process.env.NODE_ENV === 'development';

export const analyticsService = {
  async trackEvent(name: string, params?: Record<string, any>): Promise<void> {
    try {
      if (__DEV__) {
        console.log('[Analytics] trackEvent:', name, params);
        return;
      }
      await analytics().logEvent(name, params);
    } catch (error) {
      console.warn('[Analytics] trackEvent failed:', error);
    }
  },

  async setUserId(id: string): Promise<void> {
    try {
      if (__DEV__) {
        console.log('[Analytics] setUserId:', id);
        return;
      }
      await analytics().setUserId(id);
    } catch (error) {
      console.warn('[Analytics] setUserId failed:', error);
    }
  },

  async setUserProperty(key: string, value: string): Promise<void> {
    try {
      if (__DEV__) {
        console.log('[Analytics] setUserProperty:', key, value);
        return;
      }
      await analytics().setUserProperty(key, value);
    } catch (error) {
      console.warn('[Analytics] setUserProperty failed:', error);
    }
  },

  async trackScreen(name: string): Promise<void> {
    try {
      if (__DEV__) {
        console.log('[Analytics] trackScreen:', name);
        return;
      }
      await analytics().logScreenView({ screen_name: name });
    } catch (error) {
      console.warn('[Analytics] trackScreen failed:', error);
    }
  },
};
