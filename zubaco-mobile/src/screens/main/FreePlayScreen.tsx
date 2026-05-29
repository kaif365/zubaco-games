import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// TODO: Replace with API call using @tanstack/react-query
const PLACEHOLDER_GAMES = [
  { id: '1', name: 'Memory Match', icon: '🧠', bestScore: 1200 },
  { id: '2', name: 'Speed Type', icon: '⌨️', bestScore: 980 },
  { id: '3', name: 'Sliding Puzzle', icon: '🧩', bestScore: 750 },
  { id: '4', name: 'Colour Sort', icon: '🎨', bestScore: 1500 },
  { id: '5', name: 'Arrow Rush', icon: '➡️', bestScore: 600 },
  { id: '6', name: 'Pattern Survival', icon: '🔷', bestScore: 0 },
];

export const FreePlayScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // TODO: Fetch energy/lives from API
  const energy = 5;
  const maxEnergy = 5;

  const handlePlayGame = (gameId: string) => {
    // TODO: Get actual game URL and create session via API
    navigation.navigate('Game', {
      gameUrl: `https://games.zubaco.com/${gameId}`,
      sessionId: `session-${gameId}`,
      token: 'placeholder-token',
    });
  };

  const renderGameCard = ({ item }: { item: (typeof PLACEHOLDER_GAMES)[0] }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => handlePlayGame(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.gameIcon}>{item.icon}</Text>
      <Text style={styles.gameName}>{item.name}</Text>
      <Text style={styles.bestScore}>Best: {item.bestScore}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Free Play</Text>
        <View style={styles.energyBadge}>
          <Text style={styles.energyText}>⚡ {energy}/{maxEnergy}</Text>
        </View>
      </View>

      <FlatList
        data={PLACEHOLDER_GAMES}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  energyBadge: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  energyText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gameCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  gameIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  gameName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  bestScore: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
