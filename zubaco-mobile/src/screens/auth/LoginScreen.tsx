import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { captureException } from '../../services/crashReporting';

// Native auth SDKs loaded via guarded require so the JS bundle stays resilient
// if a native module is not linked in a given build.
/* eslint-disable @typescript-eslint/no-var-requires */
let GoogleSignin: any = null;
let googleStatusCodes: any = {};
try {
  const g = require('@react-native-google-signin/google-signin');
  GoogleSignin = g.GoogleSignin;
  googleStatusCodes = g.statusCodes ?? {};
} catch {
  GoogleSignin = null;
}
let appleAuth: any = null;
try {
  appleAuth = require('@invertase/react-native-apple-authentication').appleAuth;
} catch {
  try {
    appleAuth = require('react-native-apple-authentication').appleAuth;
  } catch {
    appleAuth = null;
  }
}
/* eslint-enable @typescript-eslint/no-var-requires */

const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '';

export function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const navigation = useNavigation<any>();
  const { loginWithGoogle, loginWithApple } = useAuth();

  useEffect(() => {
    if (GoogleSignin?.configure) {
      try {
        GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
      } catch (err) {
        captureException(err);
      }
    }
  }, []);

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

  async function handleGoogle() {
    if (!GoogleSignin) {
      Alert.alert('Unavailable', 'Google Sign-In is not available in this build.');
      return;
    }
    setSocialLoading('google');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      // Support both v12 ({ data: { idToken } }) and older ({ idToken }) shapes.
      const idToken = result?.data?.idToken ?? result?.idToken;
      if (!idToken) throw new Error('No Google ID token returned');
      await loginWithGoogle(idToken);
    } catch (err: any) {
      if (err?.code === googleStatusCodes?.SIGN_IN_CANCELLED) return;
      captureException(err);
      Alert.alert('Google Sign-In failed', err?.message || 'Please try again');
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleApple() {
    if (!appleAuth) {
      Alert.alert('Unavailable', 'Apple Sign-In is not available in this build.');
      return;
    }
    setSocialLoading('apple');
    try {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      const identityToken = response?.identityToken;
      if (!identityToken) throw new Error('No Apple identity token returned');
      const name = response?.fullName
        ? [response.fullName.givenName, response.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      await loginWithApple(identityToken, name || undefined);
    } catch (err: any) {
      if (err?.code === appleAuth?.Error?.CANCELED) return;
      captureException(err);
      Alert.alert('Apple Sign-In failed', err?.message || 'Please try again');
    } finally {
      setSocialLoading(null);
    }
  }

  const busy = loading || socialLoading !== null;

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
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleSendOtp}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, busy && styles.buttonDisabled]}
        onPress={handleGoogle}
        disabled={busy}
      >
        <Text style={styles.googleText}>
          {socialLoading === 'google' ? 'Signing in…' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.appleButton, busy && styles.buttonDisabled]}
          onPress={handleApple}
          disabled={busy}
        >
          <Text style={styles.appleText}>
            {socialLoading === 'apple' ? 'Signing in…' : '\uF8FF  Continue with Apple'}
          </Text>
        </TouchableOpacity>
      )}
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
  appleButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  appleText: { color: '#000000', fontSize: 16, fontWeight: '600' },
});
