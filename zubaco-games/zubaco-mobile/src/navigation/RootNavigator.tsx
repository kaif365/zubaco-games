import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';

// Main App
import { MainTabs } from './MainTabs';

// Game WebView
import { GameScreen } from '../screens/game/GameScreen';

// Additional Screens
import { FreePlayScreen } from '../screens/main/FreePlayScreen';
import { WalletScreen } from '../screens/main/WalletScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { ReferralScreen } from '../screens/main/ReferralScreen';
import { SupportScreen } from '../screens/main/SupportScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Otp: { phone: string };
  MainTabs: undefined;
  Game: { gameUrl: string; sessionId: string; token: string };
  FreePlay: undefined;
  Wallet: undefined;
  Notifications: undefined;
  Settings: undefined;
  Referral: undefined;
  Support: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Game" component={GameScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="FreePlay" component={FreePlayScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Referral" component={ReferralScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
