import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { api, Season, SeasonStage, StageGame, EntryStatus } from '../../services/api';
import { SecureStorage } from '../../services/secureStorage';
import { GAME_CATALOG, gameSlug, resolveGameUrl } from '../../constants/games';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATALOG_BY_TYPE = new Map(GAME_CATALOG.map((g) => [g.gameType, g]));

function gameLabel(gameType: string): string {
  return CATALOG_BY_TYPE.get(gameType)?.name ?? gameType.replace(/_/g, ' ');
}

function gameIcon(gameType: string): string {
  return CATALOG_BY_TYPE.get(gameType)?.icon ?? '🎮';
}

function gameUrlFor(gameType: string): string {
  const entry = CATALOG_BY_TYPE.get(gameType);
  if (entry) return resolveGameUrl(entry);
  return `https://game.zubaco.com/${gameSlug(gameType)}`;
}

const SEASON_STATUS_COLORS: Record<string, string> = {
  REGISTRATION: '#34D399',
  ACTIVE: '#6C3CE1',
  UPCOMING: '#FBBF24',
  COMPLETED: '#6B7280',
  CANCELLED: '#F87171',
};

const ENTRY_STATUS_COLORS: Record<EntryStatus, string> = {
  ACTIVE: '#34D399',
  ELIMINATED: '#F87171',
  WINNER: '#FBBF24',
  WITHDRAWN: '#6B7280',
};

function money(value: string | null): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return null;
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function TournamentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  const seasonsQuery = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api.getActiveSeasons(),
  });

  const seasons = seasonsQuery.data ?? [];
  const selectedSeason = useMemo(
    () => seasons.find((s) => s.id === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId],
  );

  const renderSeason = ({ item }: { item: Season }) => {
    const fee = money(item.entry_fee);
    const prize = money(item.prize_pool);
    const players = item._count?.entries ?? 0;
    const statusColor = SEASON_STATUS_COLORS[item.status] ?? '#6B7280';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => setSelectedSeasonId(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          {prize ? <Text style={styles.metaPrize}>🏆 {prize}</Text> : null}
          <Text style={styles.metaText}>{fee ? `Entry ${fee}` : 'Free entry'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaSub}>
            👥 {players}{item.max_players ? `/${item.max_players}` : ''} players
          </Text>
          <Text style={styles.metaSub}>
            {formatDate(item.start_date)} – {formatDate(item.end_date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tournaments</Text>
      <Text style={styles.subtitle}>Compete in seasonal eliminations</Text>

      {seasonsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6C3CE1" size="large" />
        </View>
      ) : seasonsQuery.isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Could not load tournaments.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => seasonsQuery.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : seasons.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏟️</Text>
          <Text style={styles.emptyText}>No active tournaments right now.</Text>
          <Text style={styles.emptySub}>Check back soon for the next season.</Text>
        </View>
      ) : (
        <FlatList
          data={seasons}
          renderItem={renderSeason}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={seasonsQuery.isFetching}
              onRefresh={() => seasonsQuery.refetch()}
              tintColor="#6C3CE1"
            />
          }
        />
      )}

      <SeasonDetailModal
        season={selectedSeason}
        onClose={() => setSelectedSeasonId(null)}
        navigation={navigation}
        queryClient={queryClient}
      />
    </View>
  );
}

interface SeasonDetailModalProps {
  season: Season | null;
  onClose: () => void;
  navigation: NavigationProp;
  queryClient: ReturnType<typeof useQueryClient>;
}

function SeasonDetailModal({ season, onClose, navigation, queryClient }: SeasonDetailModalProps) {
  const seasonId = season?.id ?? '';

  const statusQuery = useQuery({
    queryKey: ['seasonStatus', seasonId],
    queryFn: () => api.getSeasonStatus(seasonId),
    enabled: !!season,
    retry: false, // A 404 here simply means "not registered yet".
  });

  const registerMutation = useMutation({
    mutationFn: () => api.registerForSeason(seasonId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['seasonStatus', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert('Registered', `You joined ${res.season}. Good luck!`);
    },
    onError: (err: Error) => Alert.alert('Registration failed', err.message),
  });

  const startMutation = useMutation({
    mutationFn: async (input: { stage: SeasonStage; game: StageGame }) => {
      const [session, token] = await Promise.all([
        api.startTournamentGame(seasonId, input.stage.stage_number, input.game.game_order),
        SecureStorage.getAccessToken(),
      ]);
      return { input, session, token: token ?? '' };
    },
    onSuccess: ({ input, session, token }) => {
      onClose();
      navigation.navigate('Game', {
        gameUrl: gameUrlFor(session.game_type),
        sessionId: session.session_id,
        token,
        gameType: session.game_type,
        mode: 'TOURNAMENT',
        seasonId,
        stageNumber: input.stage.stage_number,
        gameOrder: input.game.game_order,
      });
    },
    onError: (err: Error) => Alert.alert('Cannot start game', err.message),
  });

  const isRegistered = statusQuery.isSuccess;
  const notRegistered = statusQuery.isError;
  const entryStatus = statusQuery.data?.status;

  // Map completed sessions per stage for quick lookup.
  const playedByStage = useMemo(() => {
    const map = new Map<string, Map<string, number | null>>();
    (statusQuery.data?.stages ?? []).forEach((stageEntry) => {
      const inner = new Map<string, number | null>();
      (stageEntry.game_sessions ?? []).forEach((gs) => {
        if (gs.outcome === 'COMPLETED') inner.set(gs.game_type, gs.score);
      });
      map.set(stageEntry.season_stage_id, inner);
    });
    return map;
  }, [statusQuery.data]);

  const stages = season?.stages ?? [];

  return (
    <Modal
      visible={!!season}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{season?.name}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {season?.description ? (
              <Text style={styles.modalDesc}>{season.description}</Text>
            ) : null}

            <View style={styles.summaryRow}>
              {money(season?.prize_pool ?? null) ? (
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryLabel}>Prize pool</Text>
                  <Text style={styles.summaryValue}>{money(season?.prize_pool ?? null)}</Text>
                </View>
              ) : null}
              <View style={styles.summaryPill}>
                <Text style={styles.summaryLabel}>Entry</Text>
                <Text style={styles.summaryValue}>{money(season?.entry_fee ?? null) ?? 'Free'}</Text>
              </View>
            </View>

            {statusQuery.isLoading ? (
              <ActivityIndicator color="#6C3CE1" style={styles.modalLoader} />
            ) : notRegistered ? (
              <View style={styles.registerBox}>
                <Text style={styles.registerHint}>
                  You haven't joined this tournament yet.
                </Text>
                <TouchableOpacity
                  style={[styles.registerBtn, registerMutation.isPending && styles.btnDisabled]}
                  onPress={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.registerBtnText}>
                      {money(season?.entry_fee ?? null)
                        ? `Register • ${money(season?.entry_fee ?? null)}`
                        : 'Register — Free'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : isRegistered ? (
              <View>
                {entryStatus ? (
                  <View
                    style={[
                      styles.entryStatusBadge,
                      { backgroundColor: (ENTRY_STATUS_COLORS[entryStatus] ?? '#6B7280') + '22' },
                    ]}
                  >
                    <Text style={[styles.entryStatusText, { color: ENTRY_STATUS_COLORS[entryStatus] ?? '#6B7280' }]}>
                      {entryStatus === 'ACTIVE' ? '✓ You are in the running' : entryStatus}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.sectionLabel}>Stages</Text>
                {stages.length === 0 ? (
                  <Text style={styles.emptySub}>Stages will appear once the season begins.</Text>
                ) : (
                  stages.map((stage) => {
                    const played = playedByStage.get(stage.id) ?? new Map<string, number | null>();
                    const isOpen = stage.status === 'OPEN';
                    const isEliminated = entryStatus === 'ELIMINATED';
                    return (
                      <View key={stage.id} style={styles.stageBox}>
                        <View style={styles.stageHeader}>
                          <Text style={styles.stageTitle}>
                            {stage.name || `Stage ${stage.stage_number}`}
                          </Text>
                          <Text style={styles.stageStatus}>{stage.status}</Text>
                        </View>
                        {(stage.stage_games ?? []).map((g) => {
                          const done = played.has(g.game_type);
                          const score = played.get(g.game_type);
                          const canPlay = isOpen && !done && !isEliminated;
                          return (
                            <View key={g.id} style={styles.gameRow}>
                              <Text style={styles.gameRowIcon}>{gameIcon(g.game_type)}</Text>
                              <Text style={styles.gameRowName} numberOfLines={1}>
                                {gameLabel(g.game_type)}
                              </Text>
                              {done ? (
                                <Text style={styles.gameDone}>✓ {score ?? 0}</Text>
                              ) : canPlay ? (
                                <TouchableOpacity
                                  style={[styles.playBtn, startMutation.isPending && styles.btnDisabled]}
                                  disabled={startMutation.isPending}
                                  onPress={() => startMutation.mutate({ stage, game: g })}
                                >
                                  <Text style={styles.playBtnText}>Play</Text>
                                </TouchableOpacity>
                              ) : (
                                <Text style={styles.gameLocked}>
                                  {isEliminated ? '—' : '🔒'}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 20, paddingTop: 60 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4, marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24 },
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

  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { color: '#9CA3AF', fontSize: 13, marginTop: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaPrize: { color: '#FBBF24', fontSize: 14, fontWeight: '700' },
  metaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  metaSub: { color: '#6B7280', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0F0F1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1, marginRight: 12 },
  modalClose: { color: '#9CA3AF', fontSize: 20, fontWeight: '700' },
  modalDesc: { color: '#9CA3AF', fontSize: 14, marginBottom: 12 },
  modalLoader: { marginVertical: 24 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryPill: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F1F3A',
  },
  summaryLabel: { color: '#6B7280', fontSize: 11, textTransform: 'uppercase' },
  summaryValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 4 },

  registerBox: { marginTop: 8, marginBottom: 24 },
  registerHint: { color: '#9CA3AF', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  registerBtn: {
    backgroundColor: '#6C3CE1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  entryStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
  },
  entryStatusText: { fontSize: 13, fontWeight: '700' },

  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  stageBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F1F3A',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stageTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  stageStatus: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  gameRowIcon: { fontSize: 20, marginRight: 10 },
  gameRowName: { color: '#FFFFFF', fontSize: 14, flex: 1, marginRight: 8 },
  gameDone: { color: '#34D399', fontSize: 13, fontWeight: '700' },
  gameLocked: { color: '#6B7280', fontSize: 14 },
  playBtn: {
    backgroundColor: '#6C3CE1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  playBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
