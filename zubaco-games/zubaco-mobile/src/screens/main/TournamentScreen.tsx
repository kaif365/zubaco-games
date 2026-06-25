import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { secureStorage } from '../../services/secureStorage';

// ─── Types ────────────────────────────────────────────────────
interface StageGame {
  id: string;
  game_type: string;
  game_order: number;
}

interface Stage {
  id: string;
  stage_number: number;
  name?: string;
  open_date: string;
  close_date: string;
  elimination_pct: number;
  status: 'LOCKED' | 'OPEN' | 'CLOSED';
  stage_games: StageGame[];
}

interface Season {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  prize_pool?: number;
  entry_fee?: number;
  max_players?: number;
  stages: Stage[];
  _count: { entries: number };
}

interface StageEntryGame {
  id: string;
  game_type: string;
  score: number;
  duration_ms: number;
  outcome: string;
}

interface MyStageEntry {
  season_stage: Stage;
  total_score: number;
  total_time_ms: number;
  games_played: number;
  rank?: number;
  eliminated: boolean;
  completed_at?: string;
  game_sessions: StageEntryGame[];
}

interface RankEntry {
  rank: number;
  user: { id: string; username?: string; display_name?: string; avatar_url?: string };
  score: number;
  total_time_ms?: number;
  eliminated?: boolean;
}

const STAGE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

const GAME_NAMES: Record<string, string> = {
  'sequence-recall': 'Sequence Recall', 'memory-card-matching': 'Memory Cards',
  'flash-spot': 'Flash Spot', 'object-placement-memory': 'Object Placement',
  'sliding-puzzle': 'Sliding Puzzle', 'block-fill': 'Block Fill',
  'colour-sorting': 'Colour Sorting', 'rapid-category-sort': 'Rapid Sort',
  'maze-navigation': 'Maze Navigation', 'infinity-loop': 'Infinity Loop',
  'word-unscramble': 'Word Unscramble', 'true-false-blitz': 'True/False Blitz',
  'arrows': 'Arrows', 'logic-reflector': 'Logic Reflector',
  'number-grid-sprint': 'Number Grid', 'live-route-builder': 'Live Route',
  'memory-groups': 'Memory Groups', 'reflex-endurance': 'Reflex Endurance',
  'pattern-survival': 'Pattern Survival', 'speed-type-answer': 'Speed Type',
};

export function TournamentScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [leaderboardStage, setLeaderboardStage] = useState<number | null>(null);

  // ─── Queries ─────────────────────────────────────────────────
  const { data: seasons, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api.getActiveSeasons() as Promise<Season[]>,
  });

  const { data: seasonStatus } = useQuery({
    queryKey: ['seasonStatus', selectedSeason?.id],
    queryFn: () => api.getSeasonStatus(selectedSeason!.id) as Promise<{
      status: string;
      season: Season;
      stages: MyStageEntry[];
    }>,
    enabled: !!selectedSeason,
  });

  const { data: liveRankings } = useQuery({
    queryKey: ['liveRankings', selectedSeason?.id, leaderboardStage],
    queryFn: () =>
      api.getLiveStageLeaderboard(selectedSeason!.id, leaderboardStage!) as Promise<{
        rankings: RankEntry[];
        total: number;
      }>,
    enabled: !!selectedSeason && leaderboardStage !== null,
    refetchInterval: 15000,
  });

  const { data: myRank } = useQuery({
    queryKey: ['myStageRank', selectedSeason?.id, leaderboardStage],
    queryFn: () => api.getMyStageRank(selectedSeason!.id, leaderboardStage!),
    enabled: !!selectedSeason && leaderboardStage !== null,
    refetchInterval: 15000,
  });

  // ─── Mutations ───────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (seasonId: string) => api.registerForSeason(seasonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['seasonStatus'] });
      Alert.alert('Registered!', 'You have been registered for this tournament.');
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const startGameMutation = useMutation({
    mutationFn: async ({
      seasonId, stageNumber, gameOrder,
    }: { seasonId: string; stageNumber: number; gameOrder: number }) => {
      return api.startTournamentGame(seasonId, stageNumber, gameOrder);
    },
  });

  // ─── Handlers ────────────────────────────────────────────────
  const handleRegister = useCallback((season: Season) => {
    const fee = season.entry_fee ? `₹${season.entry_fee}` : 'Free';
    Alert.alert(
      'Register for Tournament',
      `${season.name}\nEntry Fee: ${fee}\nPrize Pool: ₹${(season.prize_pool || 0).toLocaleString()}\n\nProceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Register', onPress: () => registerMutation.mutate(season.id) },
      ],
    );
  }, [registerMutation]);

  const handlePlayGame = useCallback(async (season: Season, stageNumber: number, gameOrder: number) => {
    try {
      const result = await startGameMutation.mutateAsync({ seasonId: season.id, stageNumber, gameOrder });
      const session = result as { session_id: string; game_type: string; config: any };
      const token = await secureStorage.getAccessToken();

      navigation.navigate('Game', {
        gameUrl: `https://game.zubaco.com/${session.game_type}?tournament=true`,
        sessionId: session.session_id,
        token: token ?? '',
      });
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to start game');
    }
  }, [navigation, startGameMutation]);

  const handleViewSeason = useCallback((season: Season) => {
    setSelectedSeason(season);
    // Auto-select the first open stage for leaderboard
    const openStage = season.stages.find((s) => s.status === 'OPEN');
    setLeaderboardStage(openStage?.stage_number ?? season.stages[0]?.stage_number ?? null);
  }, []);

  // ─── Season Card ─────────────────────────────────────────────
  const renderSeasonCard = ({ item: season }: { item: Season }) => {
    const isRegistration = season.status === 'REGISTRATION';
    const startDate = new Date(season.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const endDate = new Date(season.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const openStages = season.stages.filter((s) => s.status === 'OPEN').length;

    return (
      <TouchableOpacity style={styles.seasonCard} onPress={() => handleViewSeason(season)} activeOpacity={0.8}>
        <View style={styles.seasonCardHeader}>
          <Text style={styles.seasonName}>{season.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isRegistration ? '#10B981' : '#3B82F6' }]}>
            <Text style={styles.statusText}>{isRegistration ? 'REGISTERING' : 'LIVE'}</Text>
          </View>
        </View>

        {season.description ? <Text style={styles.seasonDesc}>{season.description}</Text> : null}

        <View style={styles.seasonStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Prize Pool</Text>
            <Text style={styles.statValue}>₹{(season.prize_pool || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Entry Fee</Text>
            <Text style={styles.statValue}>{season.entry_fee ? `₹${season.entry_fee}` : 'Free'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Players</Text>
            <Text style={styles.statValue}>{season._count.entries}{season.max_players ? `/${season.max_players}` : ''}</Text>
          </View>
        </View>

        <View style={styles.seasonFooter}>
          <Text style={styles.dateText}>📅 {startDate} — {endDate}</Text>
          <Text style={styles.stageInfo}>
            {season.stages.length} stages {openStages > 0 ? `• ${openStages} open` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Season Detail Modal ─────────────────────────────────────
  const renderSeasonDetail = () => {
    if (!selectedSeason) return null;
    const isRegistered = seasonStatus?.status != null;
    const playerStatus = seasonStatus?.status;

    return (
      <Modal visible={!!selectedSeason} animationType="slide" transparent onRequestClose={() => setSelectedSeason(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedSeason.name}</Text>
                {playerStatus && (
                  <View style={[styles.playerStatusBadge, {
                    backgroundColor: playerStatus === 'ELIMINATED' ? '#EF4444' : playerStatus === 'WINNER' ? '#F59E0B' : '#10B981',
                  }]}>
                    <Text style={styles.playerStatusText}>{playerStatus}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedSeason(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Register Button (if not registered) */}
              {!isRegistered && (
                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={() => handleRegister(selectedSeason)}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.registerButtonText}>
                      Register • {selectedSeason.entry_fee ? `₹${selectedSeason.entry_fee}` : 'Free'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Stage Progression Timeline */}
              <Text style={styles.sectionTitle}>Stage Progression</Text>
              {selectedSeason.stages.map((stage, idx) => {
                const myStageEntry = seasonStatus?.stages?.find(
                  (s) => s.season_stage?.stage_number === stage.stage_number,
                );
                const isOpen = stage.status === 'OPEN';
                const isClosed = stage.status === 'CLOSED';
                const isLocked = stage.status === 'LOCKED';
                const gamesPlayed = myStageEntry?.games_played ?? 0;
                const totalGames = stage.stage_games.length;
                const color = STAGE_COLORS[idx % STAGE_COLORS.length];

                return (
                  <View key={stage.id} style={styles.stageRow}>
                    {/* Timeline dot + line */}
                    <View style={styles.timeline}>
                      <View style={[styles.timelineDot, {
                        backgroundColor: isClosed ? '#6B7280' : isOpen ? color : '#374151',
                        borderColor: isOpen ? color : 'transparent',
                        borderWidth: isOpen ? 2 : 0,
                      }]} />
                      {idx < selectedSeason.stages.length - 1 && <View style={styles.timelineLine} />}
                    </View>

                    {/* Stage content */}
                    <View style={[styles.stageCard, isOpen && { borderColor: color, borderWidth: 1 }]}>
                      <View style={styles.stageCardHeader}>
                        <Text style={[styles.stageCardTitle, isLocked && { color: '#6B7280' }]}>
                          {isLocked ? '🔒' : isClosed ? '✅' : '🎮'} Stage {stage.stage_number}
                          {stage.name ? ` — ${stage.name}` : ''}
                        </Text>
                        <Text style={styles.eliminationPct}>Cut {stage.elimination_pct}%</Text>
                      </View>

                      {/* My score */}
                      {myStageEntry && (
                        <View style={styles.myScoreRow}>
                          <Text style={styles.myScoreLabel}>
                            Score: {myStageEntry.total_score} • {gamesPlayed}/{totalGames} games
                          </Text>
                          {myStageEntry.rank && (
                            <Text style={[styles.myRankText, myStageEntry.eliminated && { color: '#EF4444' }]}>
                              #{myStageEntry.rank} {myStageEntry.eliminated ? '(Eliminated)' : ''}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Game cards for OPEN stage */}
                      {isOpen && isRegistered && playerStatus === 'ACTIVE' && (
                        <View style={styles.gamesList}>
                          {stage.stage_games
                            .sort((a, b) => a.game_order - b.game_order)
                            .map((game) => {
                              const played = myStageEntry?.game_sessions?.find(
                                (gs) => gs.game_type === game.game_type && gs.outcome === 'COMPLETED',
                              );
                              return (
                                <View key={game.id} style={styles.tourneyGameCard}>
                                  <View>
                                    <Text style={styles.tourneyGameName}>
                                      {GAME_NAMES[game.game_type] || game.game_type}
                                    </Text>
                                    {played && (
                                      <Text style={styles.tourneyGameScore}>Score: {played.score}</Text>
                                    )}
                                  </View>
                                  {played ? (
                                    <Text style={styles.completedBadge}>✅</Text>
                                  ) : (
                                    <TouchableOpacity
                                      style={[styles.playBtn, { backgroundColor: color }]}
                                      onPress={() => handlePlayGame(selectedSeason, stage.stage_number, game.game_order)}
                                      disabled={startGameMutation.isPending}
                                    >
                                      {startGameMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                      ) : (
                                        <Text style={styles.playBtnText}>Play</Text>
                                      )}
                                    </TouchableOpacity>
                                  )}
                                </View>
                              );
                            })}
                        </View>
                      )}

                      {/* Leaderboard toggle */}
                      {(isOpen || isClosed) && (
                        <TouchableOpacity
                          style={styles.leaderboardToggle}
                          onPress={() => setLeaderboardStage(
                            leaderboardStage === stage.stage_number ? null : stage.stage_number,
                          )}
                        >
                          <Text style={styles.leaderboardToggleText}>
                            {leaderboardStage === stage.stage_number ? '▲ Hide Rankings' : '▼ View Rankings'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Inline Leaderboard */}
                      {leaderboardStage === stage.stage_number && liveRankings && (
                        <View style={styles.leaderboardSection}>
                          {myRank?.rank && (
                            <View style={styles.myRankCard}>
                              <Text style={styles.myRankCardLabel}>Your Rank</Text>
                              <Text style={styles.myRankCardValue}>#{myRank.rank}</Text>
                              <Text style={styles.myRankCardScore}>{myRank.score ?? 0} pts</Text>
                            </View>
                          )}

                          {liveRankings.rankings.map((entry: RankEntry) => (
                            <View
                              key={`${entry.rank}-${entry.user.id}`}
                              style={[
                                styles.rankRow,
                                entry.user.id === user?.id && styles.rankRowMe,
                                entry.eliminated && styles.rankRowEliminated,
                              ]}
                            >
                              <Text style={styles.rankNum}>
                                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                              </Text>
                              <Text style={styles.rankName} numberOfLines={1}>
                                {entry.user.display_name || entry.user.username || 'Player'}
                              </Text>
                              <Text style={styles.rankScore}>{entry.score}</Text>
                            </View>
                          ))}

                          {liveRankings.total > 50 && (
                            <Text style={styles.morePlayersText}>
                              +{liveRankings.total - 50} more players
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tournaments</Text>
        <Text style={styles.subtitle}>Compete • Survive • Win</Text>
      </View>

      {!seasons || seasons.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No Active Tournaments</Text>
          <Text style={styles.emptySubtitle}>Check back soon for new seasons!</Text>
        </View>
      ) : (
        <FlatList
          data={seasons}
          renderItem={renderSeasonCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#6366F1" />}
        />
      )}

      {renderSeasonDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { padding: 20, paddingTop: 60 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  centered: { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },

  // Season Card
  seasonCard: { backgroundColor: '#1F1F3A', borderRadius: 16, padding: 18, marginBottom: 16 },
  seasonCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seasonName: { color: '#F9FAFB', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 10 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  seasonDesc: { color: '#9CA3AF', fontSize: 13, marginBottom: 12 },
  seasonStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#151525', borderRadius: 10, padding: 12 },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#6B7280', fontSize: 10, marginBottom: 4 },
  statValue: { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  seasonFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { color: '#9CA3AF', fontSize: 12 },
  stageInfo: { color: '#6366F1', fontSize: 12, fontWeight: '600' },

  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#6B7280', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1F1F3A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { color: '#F9FAFB', fontSize: 20, fontWeight: '700' },
  modalClose: { color: '#9CA3AF', fontSize: 24, padding: 4 },
  playerStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start' },
  playerStatusText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Register
  registerButton: { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  registerButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Section
  sectionTitle: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 },

  // Timeline
  stageRow: { flexDirection: 'row', marginBottom: 16 },
  timeline: { width: 24, alignItems: 'center', marginRight: 12 },
  timelineDot: { width: 14, height: 14, borderRadius: 7 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#374151', marginTop: 4 },

  // Stage Card
  stageCard: { flex: 1, backgroundColor: '#151525', borderRadius: 12, padding: 14 },
  stageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stageCardTitle: { color: '#F9FAFB', fontSize: 14, fontWeight: '600', flex: 1 },
  eliminationPct: { color: '#EF4444', fontSize: 11, fontWeight: '600' },

  // My score
  myScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  myScoreLabel: { color: '#9CA3AF', fontSize: 12 },
  myRankText: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  // Games List
  gamesList: { gap: 8, marginBottom: 8 },
  tourneyGameCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1F1F3A', borderRadius: 8, padding: 10 },
  tourneyGameName: { color: '#F9FAFB', fontSize: 13, fontWeight: '500' },
  tourneyGameScore: { color: '#10B981', fontSize: 11, marginTop: 2 },
  completedBadge: { fontSize: 18 },
  playBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  playBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // Leaderboard toggle
  leaderboardToggle: { alignItems: 'center', paddingVertical: 8 },
  leaderboardToggleText: { color: '#6366F1', fontSize: 12, fontWeight: '600' },

  // Leaderboard
  leaderboardSection: { marginTop: 8 },
  myRankCard: { backgroundColor: '#6366F1', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  myRankCardLabel: { color: '#C7D2FE', fontSize: 12 },
  myRankCardValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  myRankCardScore: { color: '#C7D2FE', fontSize: 12 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  rankRowMe: { backgroundColor: 'rgba(99,102,241,0.15)' },
  rankRowEliminated: { opacity: 0.5 },
  rankNum: { width: 36, color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  rankName: { flex: 1, color: '#F9FAFB', fontSize: 13 },
  rankScore: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  morePlayersText: { color: '#6B7280', fontSize: 11, textAlign: 'center', marginTop: 8 },
});
