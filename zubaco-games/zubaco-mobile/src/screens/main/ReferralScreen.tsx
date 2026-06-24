import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

// TODO: Replace with API call using @tanstack/react-query
const PLACEHOLDER_REFERRALS = [
  { id: '1', name: 'Priya S.', date: 'May 15, 2026', earned: 25 },
  { id: '2', name: 'Rahul M.', date: 'May 10, 2026', earned: 25 },
  { id: '3', name: 'Neha K.', date: 'Apr 28, 2026', earned: 25 },
];

export const ReferralScreen: React.FC = () => {
  // TODO: Fetch referral data from API
  const referralCode = 'ZUBACO-AK2026';
  const totalReferrals = 3;
  const totalEarnings = 75;

  const handleShare = () => {
    // TODO: Use Share API to share referral code
  };

  const renderReferral = ({ item }: { item: (typeof PLACEHOLDER_REFERRALS)[0] }) => (
    <View style={styles.referralRow}>
      <View style={styles.referralAvatar}>
        <Text style={styles.referralAvatarText}>{item.name[0]}</Text>
      </View>
      <View style={styles.referralInfo}>
        <Text style={styles.referralName}>{item.name}</Text>
        <Text style={styles.referralDate}>{item.date}</Text>
      </View>
      <Text style={styles.referralEarned}>+₹{item.earned}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Refer & Earn</Text>

      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <Text style={styles.codeValue}>{referralCode}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareButtonText}>Share Code</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReferrals}</Text>
          <Text style={styles.statLabel}>Referrals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{totalEarnings}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
      </View>

      {/* Referred Friends List */}
      <Text style={styles.sectionTitle}>Referred Friends</Text>
      <FlatList
        data={PLACEHOLDER_REFERRALS}
        renderItem={renderReferral}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No referrals yet. Share your code!</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  codeCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  codeLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
  },
  codeValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#6C3CE1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F3A',
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D2D4A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  referralAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  referralDate: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  referralEarned: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});
