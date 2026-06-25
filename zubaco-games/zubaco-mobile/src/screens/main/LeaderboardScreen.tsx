import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

type LeaderboardTab = 'global' | 'game' | 'friends';
type TimeFilter = 'daily' | 'weekly' | 'allTime';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  gamesPlayed: number;
  isCurrentUser?: boolean;
}

const GAME_TYPES = [
  { id: 'all', label: 'Overall' },
  { id: 'block-fill', label: 'Block Fill' },
  { id: 'arrows', label: 'Arrows' },
  { id: 'sliding-puzzle', label: 'Sliding Puzzle' },
  { id: 'memory-card-matching', label: 'Memory Match' },
  { id: 'sequence-recall', label: 'Sequence' },
  { id: 'true-false-blitz', label: 'True/False' },
  { id: 'word-unscramble', label: 'Word Unscramble' },
];

export function LeaderboardScreen() {
  const [tab, setTab] = useState<LeaderboardTab>('global');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [selectedGame, setSelectedGame] = useState('all');

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', tab, timeFilter, selectedGame],
    queryFn: () => {
      if (tab === 'friends') return api.getFriendsLeaderboard();
      if (tab === 'game' && selectedGame !== 'all') {
        return api.getGameLeaderboard(selectedGame, timeFilter);
      }
      return api.getGameLeaderboard('all', timeFilter);
    },
  });

  const myRankQuery = useQuery({
    queryKey: ['myRank', tab, timeFilter, selectedGame],
    queryFn: () => api.getMyRank(selectedGame || 'all', timeFilter),
  });

  const onRefresh = useCallback(() => {
    leaderboardQuery.refetch();
    myRankQuery.refetch();
  }, [leaderboardQuery, myRankQuery]);

  const renderItem = useCallback(({ item }: { item: LeaderboardEntry }) => (
    <View style={[styles.entryRow, item.isCurrentUser && styles.currentUserRow]}>
      <View style={styles.rankContainer}>
        {item.rank <= 3 ? (
          <Text style={styles.rankMedal}>
            {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
          </Text>
        ) : (
          <Text style={styles.rankNumber}>{item.rank}</Text>
        )}
      </View>
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.displayName[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.entryName} numberOfLines={1}>
          {item.displayName}
          {item.isCurrentUser && <Text style={styles.youTag}> (You)</Text>}
        </Text>
        <Text style={styles.entryStats}>{item.gamesPlayed} games</Text>
      </View>
      <Text style={styles.entryScore}>{item.score.toLocaleString()}</Text>
    </View>
  ), []);

  const data = (leaderboardQuery.data as { entries?: LeaderboardEntry[] })?.entries ?? [];
  const myRank = (myRankQuery.data as { rank?: number; score?: number }) ?? {};

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['global', 'game', 'friends'] as LeaderboardTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'global' ? 'Global' : t === 'game' ? 'By Game' : 'Friends'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Filter */}
        <View style={styles.filterRow}>
          {(['daily', 'weekly', 'allTime'] as TimeFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, timeFilter === f && styles.filterChipActive]}
              onPress={() => setTimeFilter(f)}
            >
              <Text style={[styles.filterText, timeFilter === f && styles.filterTextActive]}>
                {f === 'daily' ? 'Today' : f === 'weekly' ? 'This Week' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Game Selector (only for "By Game" tab) */}
        {tab === 'game' && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={GAME_TYPES}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gameFilterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.gameChip, selectedGame === item.id && styles.gameChipActive]}
                onPress={() => setSelectedGame(item.id)}
              >
                <Text style={[styles.gameChipText, selectedGame === item.id && styles.gameChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* My Rank Card */}
      {myRank.rank && (
        <View style={styles.myRankCard}>
          <View style={styles.myRankLeft}>
            <Text style={styles.myRankLabel}>Your Rank</Text>
            <Text style={styles.myRankNumber}>#{myRank.rank}</Text>
          </View>
          <View style={styles.myRankRight}>
            <Text style={styles.myRankScore}>{(myRank.score ?? 0).toLocaleString()}</Text>
            <Text style={styles.myRankScoreLabel}>points</Text>
          </View>
        </View>
      )}

      {/* Leaderboard List */}
      {leaderboardQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={leaderboardQuery.isFetching}
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No rankings yet</Text>
              <Text style={styles.emptySubtext}>Play games to appear on the leaderboard!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  tabsRow: { flexDirection: 'row', marginBottom: 12, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1F2937' },
  tabActive: { backgroundColor: '#6366F1' },
  tabText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF' },
  filterRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#374151' },
  filterChipActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' },
  filterText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: '#6366F1' },
  gameFilterList: { paddingBottom: 8, gap: 6 },
  gameChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#1F2937' },
  gameChipActive: { backgroundColor: '#10B981' },
  gameChipText: { color: '#9CA3AF', fontSize: 12 },
  gameChipTextActive: { color: '#FFFFFF' },
  myRankCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#6366F1' },
  myRankLeft: {},
  myRankLabel: { color: '#9CA3AF', fontSize: 12 },
  myRankNumber: { color: '#FBBF24', fontSize: 28, fontWeight: '700' },
  myRankRight: { alignItems: 'flex-end' },
  myRankScore: { color: '#F9FAFB', fontSize: 20, fontWeight: '600' },
  myRankScoreLabel: { color: '#6B7280', fontSize: 11 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  currentUserRow: { backgroundColor: 'rgba(99,102,241,0.08)', marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 10 },
  rankContainer: { width: 36, alignItems: 'center' },
  rankMedal: { fontSize: 20 },
  rankNumber: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#F9FAFB', fontSize: 16, fontWeight: '600' },
  entryInfo: { flex: 1, marginRight: 12 },
  entryName: { color: '#F9FAFB', fontSize: 15, fontWeight: '500' },
  youTag: { color: '#6366F1', fontSize: 12 },
  entryStats: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  entryScore: { color: '#10B981', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9CA3AF', fontSize: 16 },
  emptySubtext: { color: '#6B7280', fontSize: 13, marginTop: 4 },
});
