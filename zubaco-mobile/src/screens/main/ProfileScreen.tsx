import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.display_name?.[0] || 'Z'}</Text>
      </View>
      <Text style={styles.name}>{user?.display_name || 'Player'}</Text>
      <Text style={styles.username}>@{user?.username || 'unnamed'}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user?.level || 1}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user?.xp || 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 20, paddingTop: 80, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6C3CE1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  name: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 16 },
  username: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 32, gap: 40 },
  stat: { alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  logoutBtn: { marginTop: 40, backgroundColor: '#374151', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
