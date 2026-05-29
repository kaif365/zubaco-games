import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomeScreen } from '../screens/main/HomeScreen';
import { TournamentScreen } from '../screens/main/TournamentScreen';
import { LeaderboardScreen } from '../screens/main/LeaderboardScreen';
import { WalletScreen } from '../screens/main/WalletScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C3CE1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#0F0F1A',
          borderTopColor: '#1F1F3A',
          paddingBottom: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Outfit-Medium',
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Games' }} />
      <Tab.Screen name="Tournament" component={TournamentScreen} options={{ tabBarLabel: 'Tournament' }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ tabBarLabel: 'Ranks' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ tabBarLabel: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
