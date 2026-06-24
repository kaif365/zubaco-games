import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';

export const SettingsScreen: React.FC = () => {
  // TODO: Fetch user settings from zustand store / API
  const [pushNotifications, setPushNotifications] = useState(true);
  const [sound, setSound] = useState(true);

  const handleLogout = () => {
    // TODO: Call auth context logout
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AK</Text>
        </View>
        <View>
          <Text style={styles.profileName}>Arjun Kumar</Text>
          <Text style={styles.profileEmail}>+91 98765 43210</Text>
        </View>
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: '#3E3E5E', true: '#6C3CE1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Sound</Text>
          <Switch
            value={sound}
            onValueChange={setSound}
            trackColor={{ false: '#3E3E5E', true: '#6C3CE1' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Linked Accounts */}
      <Text style={styles.sectionTitle}>Linked Accounts</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Google</Text>
          <Text style={styles.linkedStatus}>Connected</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Apple</Text>
          <Text style={styles.notLinked}>Not linked</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Phone</Text>
          <Text style={styles.linkedStatus}>+91 98765 43210</Text>
        </View>
      </View>

      {/* App Info */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
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
  settingValue: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  linkedStatus: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '500',
  },
  notLinked: {
    color: '#6B7280',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D2D4A',
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
