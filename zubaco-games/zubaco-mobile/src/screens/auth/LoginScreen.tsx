import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

export function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  async function handleSendOtp() {
    if (phone.length < 10) {
      Alert.alert('Error', 'Enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      await api.sendOtp(phone);
      navigation.navigate('Otp', { phone });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Zubaco</Text>
      <Text style={styles.subtitle}>Enter your phone number to continue</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.prefix}>+91</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
          maxLength={10}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOtp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.googleButton} onPress={() => { /* Google Sign-In */ }}>
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 24, justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F3A', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  prefix: { color: '#FFFFFF', fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16, paddingVertical: 16 },
  button: { backgroundColor: '#6C3CE1', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#374151' },
  orText: { color: '#9CA3AF', marginHorizontal: 16 },
  googleButton: { backgroundColor: '#1F1F3A', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  googleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
