import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, WalletTransaction, TransactionType } from '../../services/api';

// Optional native Razorpay checkout SDK. Loaded lazily so the app compiles and
// runs even when the native module is not installed; when present it powers the
// live deposit capture step.
type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
let RazorpayCheckout: { open: (options: Record<string, unknown>) => Promise<RazorpaySuccess> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {
  RazorpayCheckout = null;
}

const CREDIT_TYPES: TransactionType[] = ['DEPOSIT', 'PRIZE_WIN', 'REFERRAL_BONUS', 'REFUND'];

const TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  ENTRY_FEE: 'Entry Fee',
  PRIZE_WIN: 'Prize Win',
  REFERRAL_BONUS: 'Referral Bonus',
  REFUND: 'Refund',
  TDS_DEDUCTION: 'TDS Deducted',
  GST: 'GST',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const WalletScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.getWallet(),
  });

  const transactionsQuery = useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: () => api.getTransactions(1),
  });

  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [withdrawalId, setWithdrawalId] = useState<string | null>(null);

  const wallet = walletQuery.data;
  const kycVerified = wallet?.kyc_verified ?? false;
  const realBalance = wallet ? Number(wallet.balance) : 0;
  const bonusBalance = wallet ? Number(wallet.bonus_balance) : 0;

  const invalidateWallet = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  };

  const depositMutation = useMutation({
    mutationFn: async (amountInr: number) => {
      const order = await api.createDepositOrder(amountInr);
      if (!RazorpayCheckout) {
        // Order is registered server-side (idempotent). Live capture needs the
        // native Razorpay SDK, which is not bundled in this build.
        return { captured: false as const };
      }
      const result = await RazorpayCheckout.open({
        key: order.key_id,
        order_id: order.order_id,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: 'Zubaco',
        description: 'Wallet deposit',
      });
      await api.verifyDeposit(
        result.razorpay_order_id,
        result.razorpay_payment_id,
        result.razorpay_signature,
      );
      return { captured: true as const };
    },
    onSuccess: (res) => {
      setDepositVisible(false);
      setAmount('');
      invalidateWallet();
      if (res.captured) {
        Alert.alert('Deposit successful', 'Your wallet has been updated.');
      } else {
        Alert.alert(
          'Payment pending',
          'A deposit order was created. Complete the payment to credit your wallet.',
        );
      }
    },
    onError: (err: Error) => Alert.alert('Deposit failed', err.message),
  });

  const initiateWithdrawMutation = useMutation({
    mutationFn: (amountInr: number) => api.requestWithdrawal(amountInr),
    onSuccess: (res) => {
      setWithdrawalId(res.withdrawal_id);
      Alert.alert('OTP sent', res.message);
    },
    onError: (err: Error) => Alert.alert('Withdrawal failed', err.message),
  });

  const confirmWithdrawMutation = useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) => api.confirmWithdrawal(id, code),
    onSuccess: (res) => {
      setWithdrawVisible(false);
      setAmount('');
      setOtp('');
      setWithdrawalId(null);
      invalidateWallet();
      Alert.alert(
        'Withdrawal requested',
        `₹${res.net_payout} will be paid out (TDS ₹${res.tds_deducted}). Status: ${res.status}.`,
      );
    },
    onError: (err: Error) => Alert.alert('Verification failed', err.message),
  });

  const openDeposit = () => {
    setAmount('');
    setDepositVisible(true);
  };

  const openWithdraw = () => {
    setAmount('');
    setOtp('');
    setWithdrawalId(null);
    setWithdrawVisible(true);
  };

  const submitDeposit = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount to add.');
      return;
    }
    depositMutation.mutate(value);
  };

  const submitWithdrawInitiate = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount to withdraw.');
      return;
    }
    initiateWithdrawMutation.mutate(value);
  };

  const submitWithdrawConfirm = () => {
    if (!withdrawalId) return;
    if (!otp.trim()) {
      Alert.alert('Enter OTP', 'Enter the OTP sent to your phone.');
      return;
    }
    confirmWithdrawMutation.mutate({ id: withdrawalId, code: otp.trim() });
  };

  const transactions = transactionsQuery.data?.transactions ?? [];

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isCredit = CREDIT_TYPES.includes(item.type);
    const value = Number(item.amount);
    return (
      <View style={styles.transactionRow}>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionIcon}>{isCredit ? '↓' : '↑'}</Text>
          <View>
            <Text style={styles.transactionLabel}>
              {item.description || TYPE_LABELS[item.type]}
            </Text>
            <Text style={styles.transactionDate}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: isCredit ? '#34D399' : '#F87171' },
          ]}
        >
          {isCredit ? '+' : '-'}₹{Math.abs(value)}
        </Text>
      </View>
    );
  };

  const refreshing = walletQuery.isFetching || transactionsQuery.isFetching;
  const onRefresh = () => {
    walletQuery.refetch();
    transactionsQuery.refetch();
  };

  const walletError = walletQuery.error as Error | null;
  const busy =
    depositMutation.isPending ||
    initiateWithdrawMutation.isPending ||
    confirmWithdrawMutation.isPending;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>

      {!kycVerified && (
        <View style={styles.kycBanner}>
          <Text style={styles.kycText}>⚠️ Complete KYC to enable withdrawals</Text>
        </View>
      )}

      <View style={styles.balanceCard}>
        {walletQuery.isLoading ? (
          <ActivityIndicator color="#6C3CE1" style={styles.balanceLoader} />
        ) : walletError ? (
          <Text style={styles.errorText}>Could not load balance. Pull to retry.</Text>
        ) : (
          <>
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Real Money</Text>
              <Text style={styles.balanceValue}>₹{realBalance}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Bonus</Text>
              <Text style={styles.balanceValue}>₹{bonusBalance}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={openDeposit}>
          <Text style={styles.buttonText}>Add Money</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.withdrawButton, !kycVerified && styles.disabledButton]}
          activeOpacity={0.7}
          disabled={!kycVerified}
          onPress={openWithdraw}
        >
          <Text style={styles.buttonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>

      {transactionsQuery.isLoading ? (
        <ActivityIndicator color="#6C3CE1" style={styles.listLoader} />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3CE1" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {transactionsQuery.error ? 'Could not load transactions.' : 'No transactions yet'}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={depositVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDepositVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Money</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDepositVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitDeposit} disabled={busy}>
                {depositMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={withdrawVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Withdraw</Text>
            {!withdrawalId ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Amount (₹)"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setWithdrawVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirm}
                    onPress={submitWithdrawInitiate}
                    disabled={busy}
                  >
                    {initiateWithdrawMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalHint}>Enter the OTP sent to your registered phone.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="OTP"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setWithdrawVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirm}
                    onPress={submitWithdrawConfirm}
                    disabled={busy}
                  >
                    {confirmWithdrawMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  balanceLoader: {
    flex: 1,
  },
  listLoader: {
    marginTop: 24,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalHint: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0F0F1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: '#6C3CE1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
