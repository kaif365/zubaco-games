import AsyncStorage from '@react-native-async-storage/async-storage';

// Locally-persisted user preferences. The backend currently exposes NO
// notification-preferences or theme endpoint, so these are stored on-device via
// AsyncStorage. When a backend endpoint becomes available, only this module
// needs to change.

export interface AppPreferences {
  pushNotifications: boolean;
  sound: boolean;
  vibration: boolean;
  gameplayAlerts: boolean;
  biometricLock: boolean;
  theme: 'dark';
  language: 'en';
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  pushNotifications: true,
  sound: true,
  vibration: true,
  gameplayAlerts: true,
  biometricLock: false,
  theme: 'dark',
  language: 'en',
};

const STORAGE_KEY = '@zubaco/preferences';

export const preferencesService = {
  async getAll(): Promise<AppPreferences> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PREFERENCES };
      const parsed = JSON.parse(raw) as Partial<AppPreferences>;
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  },

  async set<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]): Promise<AppPreferences> {
    const current = await this.getAll();
    const next = { ...current, [key]: value };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal: preference simply won't persist across launches.
    }
    return next;
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
