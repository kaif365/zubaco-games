import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api, LeaderboardEntry } from '../../services/api';
import { GAME_CATALOG } from '../../constants/games';

const PAGE_SIZE = 50;

type Tab = 'global' | 'friends';

function displayName(user: LeaderboardEntry['user']): string {
  return user.display_name || user.username || 'Player';
}

function rankLabel(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function LeaderboardScreen() {
  const [gameType, setGameType] = useState<string>(GAME_CATALOG[0].gameType);
  const [tab, setTab] = useState<Tab>('global');

  const myRankQuery = useQuery({
    queryKey: ['myRank', gameType],
    queryFn: () => api.getMyRank(gameType),
  });

  const globalQuery = useInfiniteQuery({
    queryKey: ['leaderboard', gameType],
    queryFn: ({ pageParam }) => api.getGameLeaderboard(gameType, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  });

  const friendsQuery = useQuery({
    queryKey: ['friendsLeaderboard', gameType],
    queryFn: () => api.getFriendsLeaderboard(gameType),
    enabled: tab === 'friends',
  });

  const globalEntries = useMemo(
    () => (globalQuery.data?.pages ?? []).flat(),
    [globalQuery.data],
  );

  const isGlobal = tab === 'global';
  const entries: LeaderboardEntry[] = isGlobal ? globalEntries : (friendsQuery.data ?? []);
  const isLoading = isGlobal ? globalQuery.isLoading : friendsQuery.isLoading;
  const isError = isGlobal ? globalQuery.isError : friendsQuery.isError;
  const isFetching = isGlobal ? globalQuery.isFetching : friendsQuery.isFetching;

  const refetch = () => {
    if (isGlobal) globalQuery.refetch();
    else friendsQuery.refetch();
    myRankQuery.refetch();
  };

  const renderEntry = ({ item }: { item: LeaderboardEntry }) => {
    const highlighted = item.is_me;
    return (
      <View style={[styles.row, highlighted && styles.rowMe]}>
        <Text style={styles.rank}>{rankLabel(item.rank)}</Text>
        {item.user.avatar_url ? (
          <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>
              {displayName(item.user).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {displayName(item.user)}{highlighted ? ' (You)' : ''}
          </Text>
          {item.highest_level != null ? (
            <Text style={styles.rowSub}>Level {item.highest_level}</Text>
          ) : null}
        </View>
        <Text style={styles.rowScore}>{(item.score ?? 0).toLocaleString('en-IN')}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>See how you rank against other players</Text>

      <FlatList
        horizontal
        data={GAME_CATALOG}
        keyExtractor={(g) => g.gameType}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item }) => {
          const active = item.gameType === gameType;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setGameType(item.gameType)}
            >
              <Text style={styles.chipIcon}>{item.icon}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, isGlobal && styles.tabActive]}
          onPress={() => setTab('global')}
        >
          <Text style={[styles.tabText, isGlobal && styles.tabTextActive]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isGlobal && styles.tabActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, !isGlobal && styles.tabTextActive]}>Friends</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.myRankCard}>
        <Text style={styles.myRankLabel}>Your rank</Text>
        {myRankQuery.isLoading ? (
          <ActivityIndicator color="#6C3CE1" size="small" />
        ) : myRankQuery.data?.rank != null ? (
          <Text style={styles.myRankValue}>
            #{myRankQuery.data.rank} · {(myRankQuery.data.score ?? 0).toLocaleString('en-IN')} pts
          </Text>
        ) : (
          <Text style={styles.myRankUnranked}>Unranked — play to get on the board</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6C3CE1" size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Could not load the leaderboard.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyText}>
            {isGlobal ? 'No scores yet for this game.' : 'No friends on the board yet.'}
          </Text>
          <Text style={styles.emptySub}>
            {isGlobal ? 'Be the first to set a score!' : 'Add friends and compete together.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item, index) => `${item.user.id}-${index}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#6C3CE1" />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (isGlobal && globalQuery.hasNextPage && !globalQuery.isFetchingNextPage) {
              globalQuery.fetchNextPage();
            }
          }}
          ListFooterComponent={
            isGlobal && globalQuery.isFetchingNextPage ? (
              <ActivityIndicator color="#6C3CE1" style={styles.footerLoader} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 20, paddingTop: 60 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4, marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySub: { color: '#9CA3AF', fontSize: 13, marginTop: 6, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#6C3CE1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },

  chipsRow: { paddingVertical: 4, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#6C3CE1', borderColor: '#6C3CE1' },
  chipIcon: { fontSize: 14, marginRight: 6 },
  chipText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 4,
    marginTop: 14,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#6C3CE1' },
  tabText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    marginBottom: 8,
  },
  myRankLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  myRankValue: { color: '#FBBF24', fontSize: 15, fontWeight: '700' },
  myRankUnranked: { color: '#6B7280', fontSize: 13 },

  list: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  rowMe: { borderWidth: 1, borderColor: '#6C3CE1' },
  rank: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', width: 40 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#6C3CE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  rowInfo: { flex: 1, marginRight: 8 },
  rowName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  rowSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  rowScore: { color: '#34D399', fontSize: 15, fontWeight: '700' },
  footerLoader: { marginVertical: 16 },
});
