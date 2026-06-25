import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { api } from '../../services/api';

type KycStep = 'pan' | 'aadhaar' | 'selfie' | 'review' | 'done';

interface KycData {
  panNumber: string;
  aadhaarNumber: string;
  fullName: string;
  dateOfBirth: string;
}

export function KycScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [step, setStep] = useState<KycStep>('pan');
  const [loading, setLoading] = useState(false);
  const [kycData, setKycData] = useState<KycData>({
    panNumber: '',
    aadhaarNumber: '',
    fullName: '',
    dateOfBirth: '',
  });

  const handlePanSubmit = async () => {
    const pan = kycData.panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      Alert.alert('Invalid PAN', 'Please enter a valid PAN number (e.g., ABCDE1234F)');
      return;
    }
    setKycData((prev) => ({ ...prev, panNumber: pan }));
    setStep('aadhaar');
  };

  const handleAadhaarSubmit = async () => {
    const aadhaar = kycData.aadhaarNumber.replace(/\s/g, '');
    if (!/^\d{12}$/.test(aadhaar)) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setKycData((prev) => ({ ...prev, aadhaarNumber: aadhaar }));
    setStep('selfie');
  };

  const handleSelfieCapture = async () => {
    // In production, this would open camera via react-native-camera or ImagePicker
    // For now, skip to review
    setStep('review');
  };

  const handleSubmitKyc = async () => {
    setLoading(true);
    try {
      await api.submitKyc({
        panNumber: kycData.panNumber,
        aadhaarNumber: kycData.aadhaarNumber,
        fullName: kycData.fullName,
        dateOfBirth: kycData.dateOfBirth,
      });
      setStep('done');
    } catch (err) {
      Alert.alert('KYC Failed', (err as Error).message || 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  const renderPanStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: PAN Verification</Text>
      <Text style={styles.stepDescription}>
        Enter your PAN number for identity verification. This is required for withdrawals above ₹10,000.
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>PAN Number</Text>
        <View style={styles.textInput}>
          <Text
            style={styles.inputText}
            onPress={() => {
              // Would open TextInput in production
            }}
          >
            {kycData.panNumber || 'ABCDE1234F'}
          </Text>
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name (as on PAN)</Text>
        <View style={styles.textInput}>
          <Text style={styles.inputText}>{kycData.fullName || 'Enter full name'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handlePanSubmit}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAadhaarStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Aadhaar Verification</Text>
      <Text style={styles.stepDescription}>
        Enter your Aadhaar number. We'll send an OTP to your linked mobile for verification.
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Aadhaar Number</Text>
        <View style={styles.textInput}>
          <Text style={styles.inputText}>{kycData.aadhaarNumber || '0000 0000 0000'}</Text>
        </View>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Your Aadhaar details are encrypted and stored securely as per RBI guidelines.
        </Text>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleAadhaarSubmit}>
        <Text style={styles.primaryButtonText}>Verify Aadhaar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSelfieStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Selfie Verification</Text>
      <Text style={styles.stepDescription}>
        Take a clear selfie for liveness detection. Make sure your face is well-lit and clearly visible.
      </Text>
      <View style={styles.selfieFrame}>
        <View style={styles.selfieCircle}>
          <Text style={styles.selfieIcon}>📷</Text>
        </View>
        <Text style={styles.selfieHint}>Position your face within the circle</Text>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleSelfieCapture}>
        <Text style={styles.primaryButtonText}>Capture Selfie</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review & Submit</Text>
      <Text style={styles.stepDescription}>
        Please verify your details before submitting for KYC verification.
      </Text>
      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>PAN</Text>
          <Text style={styles.reviewValue}>{kycData.panNumber || 'XXXXX0000X'}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Aadhaar</Text>
          <Text style={styles.reviewValue}>XXXX XXXX {kycData.aadhaarNumber.slice(-4) || '0000'}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Name</Text>
          <Text style={styles.reviewValue}>{kycData.fullName || 'Your Name'}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleSubmitKyc}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Submit KYC</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDoneStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.doneIcon}>
        <Text style={styles.doneEmoji}>✅</Text>
      </View>
      <Text style={styles.stepTitle}>KYC Submitted!</Text>
      <Text style={styles.stepDescription}>
        Your KYC verification is in progress. This usually takes 24-48 hours. You'll receive a notification once verified.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.primaryButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'pan': return renderPanStep();
      case 'aadhaar': return renderAadhaarStep();
      case 'selfie': return renderSelfieStep();
      case 'review': return renderReviewStep();
      case 'done': return renderDoneStep();
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      {step !== 'done' && (
        <View style={styles.progressContainer}>
          {['pan', 'aadhaar', 'selfie', 'review'].map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                i <= ['pan', 'aadhaar', 'selfie', 'review'].indexOf(step)
                  ? styles.progressDotActive
                  : styles.progressDotInactive,
              ]}
            />
          ))}
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressDotActive: { backgroundColor: '#10B981' },
  progressDotInactive: { backgroundColor: '#374151' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: '#F9FAFB', marginBottom: 8 },
  stepDescription: { fontSize: 15, color: '#9CA3AF', lineHeight: 22, marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  textInput: { backgroundColor: '#1F2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#374151' },
  inputText: { fontSize: 16, color: '#F9FAFB' },
  primaryButton: { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  disabledButton: { opacity: 0.6 },
  infoBox: { backgroundColor: '#1E293B', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: '#6366F1', marginBottom: 16 },
  infoText: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  selfieFrame: { alignItems: 'center', paddingVertical: 40 },
  selfieCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: '#6366F1', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  selfieIcon: { fontSize: 48 },
  selfieHint: { fontSize: 14, color: '#9CA3AF' },
  reviewCard: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 8 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#374151' },
  reviewLabel: { fontSize: 14, color: '#9CA3AF' },
  reviewValue: { fontSize: 14, color: '#F9FAFB', fontWeight: '500' },
  doneIcon: { alignItems: 'center', marginBottom: 16, marginTop: 32 },
  doneEmoji: { fontSize: 64 },
});
