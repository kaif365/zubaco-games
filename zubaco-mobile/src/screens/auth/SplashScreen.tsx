import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Z</Text>
      <Text style={styles.title}>ZUBACO</Text>
      <Text style={styles.subtitle}>Play. Compete. Win.</Text>
      <ActivityIndicator color="#6C3CE1" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    color: '#6C3CE1',
    fontSize: 80,
    fontWeight: '900',
    fontFamily: 'Orbitron-Bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 8,
  },
  loader: {
    marginTop: 40,
  },
});
