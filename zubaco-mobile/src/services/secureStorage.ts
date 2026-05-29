import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'com.zubaco.app';

export const SecureStorage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Keychain.setInternetCredentials(
      `${SERVICE_NAME}.access`,
      'access_token',
      accessToken,
    );
    await Keychain.setInternetCredentials(
      `${SERVICE_NAME}.refresh`,
      'refresh_token',
      refreshToken,
    );
  },

  async getAccessToken(): Promise<string | null> {
    const credentials = await Keychain.getInternetCredentials(`${SERVICE_NAME}.access`);
    if (credentials) {
      return credentials.password;
    }
    return null;
  },

  async getRefreshToken(): Promise<string | null> {
    const credentials = await Keychain.getInternetCredentials(`${SERVICE_NAME}.refresh`);
    if (credentials) {
      return credentials.password;
    }
    return null;
  },

  async clearTokens(): Promise<void> {
    await Keychain.resetInternetCredentials(`${SERVICE_NAME}.access`);
    await Keychain.resetInternetCredentials(`${SERVICE_NAME}.refresh`);
  },
};
