import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';

export function OnboardingScreen() {
  // Placeholder - implement swipeable onboarding slides
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Zubaco</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
});
