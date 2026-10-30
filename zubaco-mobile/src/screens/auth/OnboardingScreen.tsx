import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🎮',
    title: 'Play 20+ Skill Games',
    subtitle: 'From memory and reflexes to math and logic — test your cognitive skills anytime.',
  },
  {
    icon: '🏆',
    title: 'Live Tournaments',
    subtitle: 'Compete against real players across India, climb leaderboards, and win real rewards.',
  },
  {
    icon: '⚡',
    title: 'Instant Withdrawals',
    subtitle: 'Secure payments with instant UPI transfers directly into your bank account.',
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.slideContent}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentSlide ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.buttonText}>
            {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1F1F3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#6C3CE1',
  },
  icon: {
    fontSize: 54,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    gap: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#6C3CE1',
    width: 24,
  },
  dotInactive: {
    backgroundColor: '#374151',
  },
  button: {
    backgroundColor: '#6C3CE1',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
