import { analyticsService } from './analytics';
import { addBreadcrumb } from './crashReporting';

// Centralised, non-hardcoded event catalogue. Screens call these named helpers
// instead of sprinkling raw event strings, so metadata stays consistent and
// every tracked event also drops a crash-reporting breadcrumb for context.

export const AnalyticsEvent = {
  APP_OPEN: 'app_open',
  LOGIN: 'login',
  LOGOUT: 'logout',
  SIGNUP: 'sign_up',
  SCREEN_VIEW: 'screen_view',
  PROFILE_UPDATED: 'profile_updated',
  ACCOUNT_DELETE_REQUESTED: 'account_delete_requested',
  SETTINGS_CHANGED: 'settings_changed',
  PUSH_TOKEN_REGISTERED: 'push_token_registered',
  PUSH_RECEIVED: 'push_received',
  PUSH_OPENED: 'push_opened',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export const track = {
  async event(name: AnalyticsEventName, params?: Record<string, unknown>): Promise<void> {
    addBreadcrumb(name, 'analytics');
    await analyticsService.trackEvent(name, params);
  },

  async screen(name: string): Promise<void> {
    addBreadcrumb(`screen:${name}`, 'navigation');
    await analyticsService.trackScreen(name);
  },

  async login(method: string): Promise<void> {
    await this.event(AnalyticsEvent.LOGIN, { method });
  },

  async logout(): Promise<void> {
    await this.event(AnalyticsEvent.LOGOUT);
  },

  async settingChanged(key: string, value: unknown): Promise<void> {
    await this.event(AnalyticsEvent.SETTINGS_CHANGED, { key, value: String(value) });
  },
};
