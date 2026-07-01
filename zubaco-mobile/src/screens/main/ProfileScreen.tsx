import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api, UserProfile } from '../../services/api';
import { track, AnalyticsEvent } from '../../services/analyticsEvents';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatDob(value: string | null): string {
  if (!value) return 'Not set';
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Not set';
  }
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: (ok ? '#34D399' : '#6B7280') + '22' }]}>
      <Text style={[styles.badgeText, { color: ok ? '#34D399' : '#9CA3AF' }]}>
        {ok ? '✓ ' : '• '}{label}
      </Text>
    </View>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { logout, refreshUser } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  });
  // KYC status lives on the wallet, not the profile payload.
  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.getWallet(),
  });

  const profile = profileQuery.data;
  const [editing, setEditing] = useState(false);

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#6C3CE1" size="large" />
      </View>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Couldn't load your profile.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => profileQuery.refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = profile.display_name || 'Player';
  const username = profile.username || 'unnamed';
  const kycVerified = walletQuery.data?.kyc_verified ?? false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={profileQuery.isFetching || walletQuery.isFetching}
          onRefresh={() => {
            profileQuery.refetch();
            walletQuery.refetch();
          }}
          tintColor="#6C3CE1"
        />
      }
    >
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() || 'Z'}</Text>
        </View>
      )}
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.username}>@{username}</Text>

      <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
        <Text style={styles.editText}>Edit profile</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.xp}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <Badge ok={profile.is_verified} label="Account" />
        <Badge ok={profile.age_verified} label="Age" />
        <Badge ok={kycVerified} label="KYC" />
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profile.phone || 'Not linked'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile.email || 'Not linked'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date of birth</Text>
          <Text style={styles.infoValue}>{formatDob(profile.date_of_birth)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.settingsLink} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsLinkText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <EditProfileModal
        visible={editing}
        profile={profile}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          refreshUser();
        }}
      />
    </ScrollView>
  );
}

interface EditProfileModalProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}

function EditProfileModal({ visible, profile, onClose, onSaved }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');

  const mutation = useMutation({
    mutationFn: () => {
      const payload: { username?: string; display_name?: string; avatar_url?: string } = {};
      if (username.trim() && username.trim() !== profile.username) payload.username = username.trim();
      if (displayName.trim() && displayName.trim() !== profile.display_name) payload.display_name = displayName.trim();
      if (avatarUrl.trim() !== (profile.avatar_url || '')) payload.avatar_url = avatarUrl.trim();
      return api.updateProfile(payload);
    },
    onSuccess: async () => {
      await track.event(AnalyticsEvent.PROFILE_UPDATED);
      onSaved();
    },
    onError: (err: Error) => Alert.alert('Update failed', err.message),
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#6B7280"
            maxLength={50}
          />

          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            maxLength={20}
          />

          <Text style={styles.fieldLabel}>Avatar URL</Text>
          <TextInput
            style={styles.input}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://…"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>Paste an image URL. Direct photo upload isn't supported by the server yet.</Text>

          <TouchableOpacity
            style={[styles.saveBtn, mutation.isPending && styles.buttonDisabled]}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  content: { padding: 20, paddingTop: 80, alignItems: 'center', paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#FFFFFF', fontSize: 16, marginBottom: 16 },
  retryBtn: { backgroundColor: '#6C3CE1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },

  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#6C3CE1', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1A1A2E' },
  avatarText: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  name: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 16 },
  username: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  editBtn: { marginTop: 12, borderWidth: 1, borderColor: '#6C3CE1', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  editText: { color: '#6C3CE1', fontSize: 14, fontWeight: '600' },

  statsRow: { flexDirection: 'row', marginTop: 28, gap: 40 },
  stat: { alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  infoCard: { backgroundColor: '#1A1A2E', borderRadius: 14, width: '100%', marginTop: 28, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  infoLabel: { color: '#9CA3AF', fontSize: 14 },
  infoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#2D2D4A' },

  settingsLink: { marginTop: 24, width: '100%', backgroundColor: '#1A1A2E', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  settingsLinkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  logoutBtn: { marginTop: 12, width: '100%', backgroundColor: '#1A1A2E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0F0F1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#2D2D4A' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  modalClose: { color: '#9CA3AF', fontSize: 20, fontWeight: '700' },
  fieldLabel: { color: '#9CA3AF', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1F1F3A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#374151' },
  hint: { color: '#6B7280', fontSize: 12, marginTop: 6 },
  saveBtn: { backgroundColor: '#6C3CE1', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
});
