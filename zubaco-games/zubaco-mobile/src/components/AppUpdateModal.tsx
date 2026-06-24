import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { getVersion } from 'react-native-device-info';

interface AppVersionConfig {
  minVersion: string;
  storeUrlIos: string;
  storeUrlAndroid: string;
}

function compareVersions(current: string, minimum: string): boolean {
  const currentParts = current.split('.').map(Number);
  const minParts = minimum.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, minParts.length); i++) {
    const cur = currentParts[i] || 0;
    const min = minParts[i] || 0;
    if (cur < min) return true;
    if (cur > min) return false;
  }
  return false;
}

export const AppUpdateModal: React.FC = () => {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [config, setConfig] = useState<AppVersionConfig | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('https://api.zubaco.com/config/app-version');
        const data: AppVersionConfig = await response.json();
        const currentVersion = getVersion();

        if (compareVersions(currentVersion, data.minVersion)) {
          setConfig(data);
          setUpdateRequired(true);
        }
      } catch (error) {
        console.warn('[AppUpdate] Version check failed:', error);
      }
    };

    checkVersion();
  }, []);

  const handleUpdate = () => {
    if (!config) return;
    const storeUrl =
      Platform.OS === 'ios' ? config.storeUrlIos : config.storeUrlAndroid;
    Linking.openURL(storeUrl);
  };

  if (!updateRequired) return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            A new version of Zubaco is available. Please update to continue
            using the app.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleUpdate}>
            <Text style={styles.buttonText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
