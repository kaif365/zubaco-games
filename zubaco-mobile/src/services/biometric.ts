/* eslint-disable @typescript-eslint/no-var-requires */
let ReactNativeBiometrics: any = null;
try {
  ReactNativeBiometrics = require('react-native-biometrics').default ?? require('react-native-biometrics');
} catch {
  ReactNativeBiometrics = null;
}
/* eslint-enable @typescript-eslint/no-var-requires */

const rnBiometrics = ReactNativeBiometrics ? new ReactNativeBiometrics() : null;

export async function isBiometricAvailable(): Promise<boolean> {
  if (!rnBiometrics) return false;
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    return !!available;
  } catch (error) {
    console.warn('[Biometric] isBiometricAvailable failed:', error);
    return false;
  }
}

export async function getBiometryDetails(): Promise<{ available: boolean; biometryType: string }> {
  if (!rnBiometrics) return { available: false, biometryType: 'none' };
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available: !!available, biometryType: biometryType || 'none' };
  } catch (error) {
    console.warn('[Biometric] getBiometryDetails failed:', error);
    return { available: false, biometryType: 'none' };
  }
}

export async function authenticateWithBiometric(reason?: string): Promise<boolean> {
  if (!rnBiometrics) return false;
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: reason || 'Confirm your identity',
    });
    return !!success;
  } catch (error) {
    console.warn('[Biometric] authenticateWithBiometric failed:', error);
    return false;
  }
}
