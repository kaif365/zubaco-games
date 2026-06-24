import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function OtpScreen() {
  const route = useRoute<any>();
  const { phone } = route.params;
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(text: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && text) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  }

  async function handleVerify(otpString?: string) {
    const code = otpString || otp.join('');
    if (code.length !== 6) {
      Alert.alert('Error', 'Enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await api.verifyOtp(phone, code);
      await login(
        { accessToken: result.accessToken, refreshToken: result.refreshToken },
        result.user,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to +91 {phone}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputs.current[index] = ref; }}
            style={[styles.otpInput, digit && styles.otpFilled]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => handleVerify()}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resend} onPress={() => api.sendOtp(phone)}>
        <Text style={styles.resendText}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 24, justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 40 },
  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  otpInput: {
    width: 48, height: 56, backgroundColor: '#1F1F3A', borderRadius: 12,
    color: '#FFFFFF', fontSize: 24, fontWeight: '700', textAlign: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  otpFilled: { borderColor: '#6C3CE1' },
  button: { backgroundColor: '#6C3CE1', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resend: { marginTop: 16, alignItems: 'center' },
  resendText: { color: '#6C3CE1', fontSize: 14 },
});
