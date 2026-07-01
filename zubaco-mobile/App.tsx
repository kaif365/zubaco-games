import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { AuthProvider } from './src/contexts/AuthContext';
import { OfflineProvider } from './src/contexts/OfflineContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initCrashReporting } from './src/services/crashReporting';
import { installGlobalErrorHandlers } from './src/services/globalErrorHandler';
import { pushNotifications } from './src/services/pushNotifications';
import { track } from './src/services/analyticsEvents';

// One-time, side-effect initialisation at module load (before first render).
initCrashReporting();
installGlobalErrorHandlers();
pushNotifications.configure();

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
  const routeNameRef = useRef<string | undefined>(undefined);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OfflineProvider>
              <NavigationContainer
                ref={navigationRef}
                linking={linking}
                onReady={() => {
                  routeNameRef.current = navigationRef.getCurrentRoute()?.name;
                }}
                onStateChange={() => {
                  const previous = routeNameRef.current;
                  const current = navigationRef.getCurrentRoute()?.name;
                  if (current && previous !== current) {
                    track.screen(current).catch(() => {});
                  }
                  routeNameRef.current = current;
                }}
              >
                <RootNavigator />
              </NavigationContainer>
            </OfflineProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
