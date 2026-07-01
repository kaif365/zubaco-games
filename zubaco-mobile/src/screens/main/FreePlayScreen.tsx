import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { api } from '../../services/api';
import { SecureStorage } from '../../services/secureStorage';
import { GAME_CATALOG, GameCatalogEntry, resolveGameUrl } from '../../constants/games';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FreePlayScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const energyQuery = useQuery({
    queryKey: ['energy'],
    queryFn: () => api.getEnergy(),
  });

  const progressQuery = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.getAllProgress(),
  });

  const startMutation = useMutation({
    mutationFn: async (entry: GameCatalogEntry) => {
      const level = progressQuery.data?.[entry.gameType]?.current_level ?? 1;
      const [session, token] = await Promise.all([
        api.startLevel(entry.gameType, level),
        SecureStorage.getAccessToken(),
      ]);
      return { entry, level, session, token: token ?? '' };
    },
    onSuccess: ({ entry, level, session, token }) => {
      // Real backend session — no placeholder values reach the WebView.
      navigation.navigate('Game', {
        gameUrl: resolveGameUrl(entry),
        sessionId: session.session_id,
        token,
        gameType: entry.gameType,
        level,
        mode: 'FREE_PLAY',
      });
      energyQuery.refetch();
    },
    onError: (err: Error) => Alert.alert('Cannot start game', err.message),
  });

  const energy = energyQuery.data;
  const available = energy?.total_available ?? 0;
  const maxEnergy = energy?.max_lives ?? 5;

  const handlePlayGame = (entry: GameCatalogEntry) => {
    if (startMutation.isPending) return;
    startMutation.mutate(entry);
  };

  const renderGameCard = ({ item }: { item: GameCatalogEntry }) => {
    const bestScore = progressQuery.data?.[item.gameType]?.best_score ?? 0;
    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handlePlayGame(item)}
        activeOpacity={0.7}
        disabled={startMutation.isPending}
      >
        <Text style={styles.gameIcon}>{item.icon}</Text>
        <Text style={styles.gameName}>{item.name}</Text>
        <Text style={styles.bestScore}>Best: {bestScore}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Free Play</Text>
        <View style={styles.energyBadge}>
          {energyQuery.isLoading ? (
            <ActivityIndicator color="#FBBF24" size="small" />
          ) : (
            <Text style={styles.energyText}>⚡ {available}/{maxEnergy}</Text>
          )}
        </View>
      </View>

      {startMutation.isPending && (
        <View style={styles.startingBanner}>
          <ActivityIndicator color="#6C3CE1" size="small" />
          <Text style={styles.startingText}>Starting session…</Text>
        </View>
      )}

      <FlatList
        data={GAME_CATALOG}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.gameType}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={energyQuery.isFetching || progressQuery.isFetching}
            onRefresh={() => {
              energyQuery.refetch();
              progressQuery.refetch();
            }}
            tintColor="#6C3CE1"
          />
        }
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
  startingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  startingText: {
    color: '#9CA3AF',
    fontSize: 13,
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
