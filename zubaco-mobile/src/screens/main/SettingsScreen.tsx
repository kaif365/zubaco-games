import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  preferencesService,
  DEFAULT_PREFERENCES,
  AppPreferences,
} from '../../services/preferences';
import { isBiometricAvailable, authenticateWithBiometric } from '../../services/biometric';
import { track } from '../../services/analyticsEvents';

// App version resolved via device-info when the native module is linked.
/* eslint-disable @typescript-eslint/no-var-requires */
function getAppVersion(): string {
  try {
    const DeviceInfo = require('react-native-device-info').default;
    return DeviceInfo.getVersion();
  } catch {
    return '1.0.0';
  }
}
/* eslint-enable @typescript-eslint/no-var-requires */

const TERMS_URL = 'https://zubaco.com/terms';
const PRIVACY_URL = 'https://zubaco.com/privacy';
const CONTACT_URL = 'mailto:support@zubaco.com';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const appVersion = getAppVersion();

  useEffect(() => {
    preferencesService.getAll().then(setPrefs).catch(() => {});
    isBiometricAvailable().then(setBiometricSupported).catch(() => setBiometricSupported(false));
  }, []);

  async function updatePref<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) {
    const next = await preferencesService.set(key, value);
    setPrefs(next);
    track.settingChanged(String(key), value).catch(() => {});
  }

  async function handleBiometricToggle(value: boolean) {
    if (value) {
      const ok = await authenticateWithBiometric('Enable biometric lock');
      if (!ok) {
        Alert.alert('Verification failed', 'Could not enable biometric lock.');
        return;
      }
    }
    await updatePref('biometricLock', value);
  }

  function openLink(url: string) {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open link.'));
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently removes your account and anonymizes your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete account.');
            }
          },
        },
      ],
    );
  }

  function confirmLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  const initial = (user?.display_name || user?.username || 'Z')[0]?.toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user?.display_name || user?.username || 'Player'}</Text>
          <Text style={styles.profileEmail}>{user?.phone || user?.email || ''}</Text>
        </View>
      </View>

      {/* Notification Preferences (stored locally on device) */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={prefs.pushNotifications}
            onValueChange={(v) => updatePref('pushNotifications', v)}
            trackColor={{ false: '#3E3E5E', true: '#6C3CE1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Gameplay Alerts</Text>
          <Switch
            value={prefs.gameplayAlerts}
            onValueChange={(v) => updatePref('gameplayAlerts', v)}
            trackColor={{ false: '#3E3E5E', true: '#6C3CE1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Sound</Text>
          <Switch
            value={prefs.sound}
            onValueChange={(v) => updatePref('sound', v)}
            trackColor={{ false: '#3E3E5E', true: '#6C3CE1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Vibration</Text>
          <Switch
            value={prefs.vibration}
            onValueChange={(v) => updatePref('vibration', v)}
            trackColor={{ false: '#3E3E5E', true: '#6C3CE1' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Security */}
      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Biometric Lock</Text>
            {!biometricSupported && (
              <Text style={styles.settingHint}>Not available on this device</Text>
            )}
          </View>
          <Switch
            value={prefs.biometricLock}
            onValueChange={handleBiometricToggle}
            disabled={!biometricSupported}
            trackColor={{ false: '#3E3E5E', true: '#6C3CE1' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Privacy & Legal */}
      <Text style={styles.sectionTitle}>Privacy & Legal</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow} onPress={() => openLink(TERMS_URL)}>
          <Text style={styles.settingLabel}>Terms of Service</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.settingRow} onPress={() => openLink(PRIVACY_URL)}>
          <Text style={styles.settingLabel}>Privacy Policy</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.settingRow} onPress={() => openLink(CONTACT_URL)}>
          <Text style={styles.settingLabel}>Contact Support</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingValue}>{appVersion}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Language</Text>
          <Text style={styles.settingValue}>English</Text>
        </View>
      </View>

      {/* Account actions */}
      <TouchableOpacity style={styles.deleteButton} onPress={confirmDeleteAccount} activeOpacity={0.7}>
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C3CE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  settingHint: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  settingValue: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  chevron: {
    color: '#6B7280',
    fontSize: 22,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#2D2D4A',
  },
  deleteButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteText: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
