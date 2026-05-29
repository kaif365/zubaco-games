import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

// TODO: Replace with API call using @tanstack/react-query
const PLACEHOLDER_TRANSACTIONS = [
  { id: '1', type: 'credit', label: 'Tournament Win', amount: 50, date: '2 hours ago' },
  { id: '2', type: 'debit', label: 'Entry Fee', amount: -10, date: '3 hours ago' },
  { id: '3', type: 'credit', label: 'Referral Bonus', amount: 25, date: '1 day ago' },
  { id: '4', type: 'credit', label: 'Deposit', amount: 100, date: '2 days ago' },
  { id: '5', type: 'debit', label: 'Entry Fee', amount: -10, date: '3 days ago' },
];

export const WalletScreen: React.FC = () => {
  // TODO: Fetch wallet data from API
  const realBalance = 150;
  const bonusBalance = 45;
  const kycVerified = false;

  const renderTransaction = ({ item }: { item: (typeof PLACEHOLDER_TRANSACTIONS)[0] }) => (
    <View style={styles.transactionRow}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionIcon}>
          {item.type === 'credit' ? '↓' : '↑'}
        </Text>
        <View>
          <Text style={styles.transactionLabel}>{item.label}</Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.amount > 0 ? '#34D399' : '#F87171' },
        ]}
      >
        {item.amount > 0 ? '+' : ''}₹{Math.abs(item.amount)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>

      {!kycVerified && (
        <View style={styles.kycBanner}>
          <Text style={styles.kycText}>⚠️ Complete KYC to enable withdrawals</Text>
        </View>
      )}

      <View style={styles.balanceCard}>
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Real Money</Text>
          <Text style={styles.balanceValue}>₹{realBalance}</Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Bonus</Text>
          <Text style={styles.balanceValue}>₹{bonusBalance}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Add Money</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.withdrawButton, !kycVerified && styles.disabledButton]}
          activeOpacity={0.7}
          disabled={!kycVerified}
        >
          <Text style={styles.buttonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>

      <FlatList
        data={PLACEHOLDER_TRANSACTIONS}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
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
    marginBottom: 16,
  },
  kycBanner: {
    backgroundColor: '#44403C',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  kycText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '500',
  },
  balanceCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceSection: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2D2D4A',
  },
  balanceLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#6C3CE1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6C3CE1',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
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
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F3A',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  transactionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
});
