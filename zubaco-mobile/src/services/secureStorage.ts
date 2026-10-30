/* eslint-disable @typescript-eslint/no-var-requires */
let Keychain: any = null;
try {
  Keychain = require('react-native-keychain');
} catch {
  Keychain = null;
}
/* eslint-enable @typescript-eslint/no-var-requires */

const SERVICE_NAME = 'com.zubaco.app';

// In-memory fallback if Keychain native module is not linked (e.g. mock/test)
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export const SecureStorage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (Keychain?.setInternetCredentials) {
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
    } else {
      memoryAccessToken = accessToken;
      memoryRefreshToken = refreshToken;
    }
  },

  async getAccessToken(): Promise<string | null> {
    if (Keychain?.getInternetCredentials) {
      const credentials = await Keychain.getInternetCredentials(`${SERVICE_NAME}.access`);
      if (credentials) {
        return credentials.password;
      }
      return null;
    }
    return memoryAccessToken;
  },

  async getRefreshToken(): Promise<string | null> {
    if (Keychain?.getInternetCredentials) {
      const credentials = await Keychain.getInternetCredentials(`${SERVICE_NAME}.refresh`);
      if (credentials) {
        return credentials.password;
      }
      return null;
    }
    return memoryRefreshToken;
  },

  async clearTokens(): Promise<void> {
    if (Keychain?.resetInternetCredentials) {
      await Keychain.resetInternetCredentials(`${SERVICE_NAME}.access`);
      await Keychain.resetInternetCredentials(`${SERVICE_NAME}.refresh`);
    } else {
      memoryAccessToken = null;
      memoryRefreshToken = null;
    }
  },
};
