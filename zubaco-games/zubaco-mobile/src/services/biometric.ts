import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export async function isBiometricAvailable(): Promise<{
  available: boolean;
  biometryType: string;
}> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType: biometryType || 'none' };
  } catch (error) {
    console.warn('[Biometric] isBiometricAvailable failed:', error);
    return { available: false, biometryType: 'none' };
  }
}

export async function authenticateWithBiometric(
  reason?: string,
): Promise<{ success: boolean }> {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: reason || 'Confirm your identity',
    });
    return { success };
  } catch (error) {
    console.warn('[Biometric] authenticateWithBiometric failed:', error);
    return { success: false };
  }
}
