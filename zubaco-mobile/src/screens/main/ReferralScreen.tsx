import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

export const ReferralScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const [applyCode, setApplyCode] = useState('');

  const codeQuery = useQuery({
    queryKey: ['referralCode'],
    queryFn: () => api.getReferralCode(),
  });

  const referralCode = codeQuery.data?.code ?? '';

  const applyMutation = useMutation({
    mutationFn: (code: string) => api.applyReferralCode(code),
    onSuccess: (res) => {
      setApplyCode('');
      // Referral bonus is credited to the wallet on both sides.
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert('Success', res.message);
    },
    onError: (err: Error) => Alert.alert('Could not apply code', err.message),
  });

  const handleShare = async () => {
    if (!referralCode) return;
    try {
      await Share.share({
        message: `Join me on Zubaco! Use my referral code ${referralCode} to get a bonus. https://zubaco.com`,
      });
    } catch (err) {
      Alert.alert('Share failed', (err as Error).message);
    }
  };

  const handleApply = () => {
    const code = applyCode.trim();
    if (!code) {
      Alert.alert('Enter a code', 'Please enter a referral code to apply.');
      return;
    }
    applyMutation.mutate(code);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Refer & Earn</Text>

      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        {codeQuery.isLoading ? (
          <ActivityIndicator color="#6C3CE1" style={styles.codeLoader} />
        ) : codeQuery.error ? (
          <Text style={styles.codeError}>Could not load your code</Text>
        ) : (
          <Text style={styles.codeValue}>{referralCode}</Text>
        )}
        <TouchableOpacity
          style={[styles.shareButton, !referralCode && styles.disabled]}
          onPress={handleShare}
          activeOpacity={0.7}
          disabled={!referralCode}
        >
          <Text style={styles.shareButtonText}>Share Code</Text>
        </TouchableOpacity>
      </View>

      {/* Apply a referral code */}
      <Text style={styles.sectionTitle}>Have a referral code?</Text>
      <View style={styles.applyRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter referral code"
          placeholderTextColor="#6B7280"
          autoCapitalize="characters"
          value={applyCode}
          onChangeText={setApplyCode}
        />
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
          activeOpacity={0.7}
          disabled={applyMutation.isPending}
        >
          {applyMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.applyButtonText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Referral bonuses are credited automatically to your Wallet for both you and your
          friend. Check your Wallet transactions to see referral rewards.
        </Text>
      </View>
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
    marginBottom: 20,
  },
  codeCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
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
  codeLoader: {
    marginBottom: 16,
  },
  codeError: {
    color: '#F87171',
    fontSize: 14,
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#6C3CE1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  disabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  applyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  applyButton: {
    backgroundColor: '#6C3CE1',
    borderRadius: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
  },
});
