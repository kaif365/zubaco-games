import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { OfflineProvider } from './src/contexts/OfflineContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30000 },
  },
});

const linking = {
  prefixes: ['zubaco://', 'https://zubaco.com'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Tournament: 'tournament',
          Leaderboard: 'leaderboard',
          Wallet: 'wallet',
          Profile: 'profile',
        },
      },
      Game: 'game/:gameUrl',
      FreePlay: 'free-play',
      Notifications: 'notifications',
      Referral: 'referral/:code',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OfflineProvider>
            <NavigationContainer linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </OfflineProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
