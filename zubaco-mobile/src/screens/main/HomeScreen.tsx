import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const GAME_LIST = [
  { type: 'SEQUENCE_RECALL', name: 'Sequence Recall', stage: 1, icon: '🧠' },
  { type: 'MEMORY_CARD_MATCHING', name: 'Memory Cards', stage: 1, icon: '🃏' },
  { type: 'FLASH_SPOT', name: 'Flash Spot', stage: 1, icon: '⚡' },
  { type: 'OBJECT_PLACEMENT_MEMORY', name: 'Object Placement', stage: 1, icon: '📍' },
  { type: 'SLIDING_PUZZLE', name: 'Sliding Puzzle', stage: 2, icon: '🧩' },
  { type: 'BLOCK_FILL', name: 'Block Fill', stage: 2, icon: '🟦' },
  { type: 'COLOUR_SORTING', name: 'Colour Sorting', stage: 2, icon: '🎨' },
  { type: 'RAPID_CATEGORY_SORT', name: 'Rapid Sort', stage: 2, icon: '📦' },
  { type: 'MAZE_NAVIGATION', name: 'Maze Navigation', stage: 3, icon: '🏁' },
  { type: 'INFINITY_LOOP', name: 'Infinity Loop', stage: 3, icon: '♾️' },
  { type: 'WORD_UNSCRAMBLE', name: 'Word Unscramble', stage: 3, icon: '🔤' },
  { type: 'TRUE_FALSE_BLITZ', name: 'True False Blitz', stage: 3, icon: '✅' },
  { type: 'ARROWS', name: 'Arrows', stage: 4, icon: '🏹' },
  { type: 'LOGIC_REFLECTOR', name: 'Logic Reflector', stage: 4, icon: '🪞' },
  { type: 'NUMBER_GRID_SPRINT', name: 'Number Grid', stage: 4, icon: '🔢' },
  { type: 'LIVE_ROUTE_BUILDER', name: 'Live Route', stage: 4, icon: '🗺️' },
  { type: 'MEMORY_GROUPS', name: 'Memory Groups', stage: 5, icon: '🧬' },
  { type: 'REFLEX_ENDURANCE', name: 'Reflex Endurance', stage: 5, icon: '🎯' },
  { type: 'PATTERN_SURVIVAL', name: 'Pattern Survival', stage: 5, icon: '🔮' },
  { type: 'SPEED_TYPE_ANSWER', name: 'Speed Type', stage: 5, icon: '⌨️' },
];

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.getAllProgress(),
  });

  const renderGameCard = ({ item }: { item: typeof GAME_LIST[0] }) => {
    const gameProgress = (progress as any)?.[item.type];
    const level = gameProgress?.current_level || 1;

    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => {
          // Navigate to level selection or directly start game
          navigation.navigate('Game', {
            gameUrl: `https://game.zubaco.com/${item.type.toLowerCase().replace(/_/g, '-')}`,
            sessionId: 'pending', // Will be set after startLevel API call
            token: '', // Will be injected from AsyncStorage
          });
        }}
      >
        <Text style={styles.gameIcon}>{item.icon}</Text>
        <Text style={styles.gameName}>{item.name}</Text>
        <Text style={styles.gameLevel}>Level {level}</Text>
        <View style={styles.stageBadge}>
          <Text style={styles.stageText}>Stage {item.stage}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.display_name || 'Player'}!</Text>
        <Text style={styles.subtitle}>Level {user?.level || 1} • {user?.xp || 0} XP</Text>
      </View>

      <FlatList
        data={GAME_LIST}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.type}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { padding: 20, paddingTop: 60 },
  greeting: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  grid: { padding: 10 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  gameCard: {
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  gameIcon: { fontSize: 36, marginBottom: 8 },
  gameName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  gameLevel: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  stageBadge: {
    backgroundColor: '#6C3CE1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  stageText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
});
