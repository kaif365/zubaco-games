import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { secureStorage } from '../../services/secureStorage';

// ─── Stage/Game Configuration ─────────────────────────────────────
const STAGES = [
  { id: 1, name: 'Memory Masters', color: '#10B981', icon: '🧠', requiredXp: 0 },
  { id: 2, name: 'Puzzle Wizards', color: '#3B82F6', icon: '🧩', requiredXp: 500 },
  { id: 3, name: 'Word Warriors', color: '#8B5CF6', icon: '🔤', requiredXp: 1500 },
  { id: 4, name: 'Logic Lords', color: '#F59E0B', icon: '🏹', requiredXp: 3000 },
  { id: 5, name: 'Speed Demons', color: '#EF4444', icon: '⚡', requiredXp: 5000 },
];

const GAME_LIST = [
  { type: 'sequence-recall', name: 'Sequence Recall', stage: 1, icon: '🧠' },
  { type: 'memory-card-matching', name: 'Memory Cards', stage: 1, icon: '🃏' },
  { type: 'flash-spot', name: 'Flash Spot', stage: 1, icon: '⚡' },
  { type: 'object-placement-memory', name: 'Object Placement', stage: 1, icon: '📍' },
  { type: 'sliding-puzzle', name: 'Sliding Puzzle', stage: 2, icon: '🧩' },
  { type: 'block-fill', name: 'Block Fill', stage: 2, icon: '🟦' },
  { type: 'colour-sorting', name: 'Colour Sorting', stage: 2, icon: '🎨' },
  { type: 'rapid-category-sort', name: 'Rapid Sort', stage: 2, icon: '📦' },
  { type: 'maze-navigation', name: 'Maze Navigation', stage: 3, icon: '🏁' },
  { type: 'infinity-loop', name: 'Infinity Loop', stage: 3, icon: '♾️' },
  { type: 'word-unscramble', name: 'Word Unscramble', stage: 3, icon: '🔤' },
  { type: 'true-false-blitz', name: 'True False Blitz', stage: 3, icon: '✅' },
  { type: 'arrows', name: 'Arrows', stage: 4, icon: '🏹' },
  { type: 'logic-reflector', name: 'Logic Reflector', stage: 4, icon: '🪞' },
  { type: 'number-grid-sprint', name: 'Number Grid', stage: 4, icon: '🔢' },
  { type: 'live-route-builder', name: 'Live Route', stage: 4, icon: '🗺️' },
  { type: 'memory-groups', name: 'Memory Groups', stage: 5, icon: '🧬' },
  { type: 'reflex-endurance', name: 'Reflex Endurance', stage: 5, icon: '🎯' },
  { type: 'pattern-survival', name: 'Pattern Survival', stage: 5, icon: '🔮' },
  { type: 'speed-type-answer', name: 'Speed Type', stage: 5, icon: '⌨️' },
];

const MAX_LEVELS = 7;

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [selectedGame, setSelectedGame] = useState<typeof GAME_LIST[0] | null>(null);
  const [levelPickerVisible, setLevelPickerVisible] = useState(false);

  const userXp = user?.xp ?? 0;
  const unlockedStage = STAGES.reduce((max, s) => (userXp >= s.requiredXp ? s.id : max), 1);

  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.getAllProgress(),
  });

  const startGameMutation = useMutation({
    mutationFn: async ({ gameType, level }: { gameType: string; level: number }) => {
      const response = await api.startLevel(gameType, level);
      return response;
    },
  });

  const handleGamePress = useCallback((game: typeof GAME_LIST[0]) => {
    if (game.stage > unlockedStage) {
      const stageInfo = STAGES.find((s) => s.id === game.stage);
      Alert.alert(
        '🔒 Stage Locked',
        `You need ${stageInfo?.requiredXp.toLocaleString()} XP to unlock ${stageInfo?.name}.\nYou have ${userXp.toLocaleString()} XP.`,
        [{ text: 'OK' }],
      );
      return;
    }
    setSelectedGame(game);
    setLevelPickerVisible(true);
  }, [unlockedStage, userXp]);

  const handleLevelSelect = useCallback(async (level: number) => {
    if (!selectedGame) return;
    setLevelPickerVisible(false);

    try {
      const session = await startGameMutation.mutateAsync({
        gameType: selectedGame.type,
        level,
      });
      const token = await secureStorage.getAccessToken();

      navigation.navigate('Game', {
        gameUrl: `https://game.zubaco.com/${selectedGame.type}?stage=${level}`,
        sessionId: session.session_id,
        token: token ?? '',
      });
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to start game');
    }
  }, [selectedGame, navigation, startGameMutation]);

  const getGameProgress = (gameType: string) => {
    const p = (progress as Record<string, { current_level?: number; best_score?: number }>)?.[gameType];
    return { level: p?.current_level ?? 1, bestScore: p?.best_score ?? 0 };
  };

  const renderStageSection = ({ item: stage }: { item: typeof STAGES[0] }) => {
    const isLocked = stage.id > unlockedStage;
    const stageGames = GAME_LIST.filter((g) => g.stage === stage.id);

    return (
      <View style={styles.stageSection}>
        {/* Stage Header */}
        <View style={[styles.stageHeader, { borderLeftColor: isLocked ? '#374151' : stage.color }]}>
          <View style={styles.stageHeaderLeft}>
            <Text style={styles.stageIcon}>{isLocked ? '🔒' : stage.icon}</Text>
            <View>
              <Text style={[styles.stageName, isLocked && styles.lockedText]}>
                Stage {stage.id}: {stage.name}
              </Text>
              {isLocked && (
                <Text style={styles.unlockText}>{stage.requiredXp.toLocaleString()} XP to unlock</Text>
              )}
            </View>
          </View>
          {!isLocked && (
            <View style={[styles.stageActiveBadge, { backgroundColor: stage.color }]}>
              <Text style={styles.stageActiveText}>OPEN</Text>
            </View>
          )}
        </View>

        {/* Games Grid */}
        <View style={styles.gamesRow}>
          {stageGames.map((game) => {
            const p = getGameProgress(game.type);
            return (
              <TouchableOpacity
                key={game.type}
                style={[styles.gameCard, isLocked && styles.gameCardLocked]}
                onPress={() => handleGamePress(game)}
                disabled={startGameMutation.isPending}
                activeOpacity={isLocked ? 1 : 0.7}
              >
                <Text style={styles.gameIcon}>{game.icon}</Text>
                <Text style={[styles.gameName, isLocked && styles.lockedText]} numberOfLines={1}>
                  {game.name}
                </Text>
                {!isLocked && (
                  <View style={styles.gameProgressRow}>
                    {Array.from({ length: MAX_LEVELS }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.levelDot,
                          i < p.level ? { backgroundColor: stage.color } : { backgroundColor: '#374151' },
                        ]}
                      />
                    ))}
                  </View>
                )}
                {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.display_name || 'Player'}!</Text>
          <Text style={styles.subtitle}>Level {user?.level || 1} • {userXp.toLocaleString()} XP</Text>
        </View>
        {/* Bucket/Tier indicator */}
        <View style={styles.bucketBadge}>
          <Text style={styles.bucketText}>
            {userXp >= 5000 ? '💎 Diamond' : userXp >= 3000 ? '🥇 Gold' : userXp >= 1500 ? '🥈 Silver' : '🥉 Bronze'}
          </Text>
        </View>
      </View>

      {/* XP Progress to next stage */}
      {unlockedStage < 5 && (
        <View style={styles.xpProgressContainer}>
          <Text style={styles.xpProgressLabel}>
            Next stage: {STAGES[unlockedStage]?.name} ({STAGES[unlockedStage]?.requiredXp.toLocaleString()} XP)
          </Text>
          <View style={styles.xpBar}>
            <View
              style={[
                styles.xpBarFill,
                {
                  width: `${Math.min(100, (userXp / (STAGES[unlockedStage]?.requiredXp ?? 1)) * 100)}%`,
                  backgroundColor: STAGES[unlockedStage]?.color ?? '#6366F1',
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Stage List with Games */}
      <FlatList
        data={STAGES}
        renderItem={renderStageSection}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.stageList}
      />

      {/* Level Selection Modal */}
      <Modal
        visible={levelPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLevelPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedGame?.icon} {selectedGame?.name}</Text>
              <TouchableOpacity onPress={() => setLevelPickerVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select Level</Text>

            <ScrollView contentContainerStyle={styles.levelGrid}>
              {Array.from({ length: MAX_LEVELS }, (_, i) => {
                const level = i + 1;
                const p = selectedGame ? getGameProgress(selectedGame.type) : { level: 1 };
                const isUnlocked = level <= p.level;
                const isCurrent = level === p.level;

                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelButton,
                      isUnlocked && styles.levelUnlocked,
                      isCurrent && styles.levelCurrent,
                      !isUnlocked && styles.levelLocked,
                    ]}
                    onPress={() => isUnlocked && handleLevelSelect(level)}
                    disabled={!isUnlocked || startGameMutation.isPending}
                  >
                    {startGameMutation.isPending && isCurrent ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={[styles.levelNumber, !isUnlocked && styles.lockedText]}>
                          {isUnlocked ? level : '🔒'}
                        </Text>
                        {isUnlocked && (
                          <Text style={styles.levelStars}>
                            {'⭐'.repeat(Math.min(3, level <= p.level - 1 ? 3 : level === p.level ? 1 : 0))}
                          </Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.playButton}
              onPress={() => {
                const p = selectedGame ? getGameProgress(selectedGame.type) : { level: 1 };
                handleLevelSelect(p.level);
              }}
            >
              <Text style={styles.playButtonText}>▶ Play Current Level</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  greeting: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  bucketBadge: { backgroundColor: '#1F2937', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  bucketText: { color: '#F9FAFB', fontSize: 12, fontWeight: '600' },
  xpProgressContainer: { paddingHorizontal: 20, marginBottom: 12 },
  xpProgressLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  xpBar: { height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 3 },
  stageList: { paddingHorizontal: 16, paddingBottom: 100 },
  stageSection: { marginBottom: 24 },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12 },
  stageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageIcon: { fontSize: 22 },
  stageName: { color: '#F9FAFB', fontSize: 16, fontWeight: '600' },
  lockedText: { color: '#6B7280' },
  unlockText: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  stageActiveBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stageActiveText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  gamesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameCard: { backgroundColor: '#1F1F3A', borderRadius: 14, padding: 14, width: '47%', alignItems: 'center' },
  gameCardLocked: { backgroundColor: '#151525', opacity: 0.6 },
  gameIcon: { fontSize: 32, marginBottom: 6 },
  gameName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  gameProgressRow: { flexDirection: 'row', gap: 3, marginTop: 8 },
  levelDot: { width: 6, height: 6, borderRadius: 3 },
  lockIcon: { marginTop: 8, fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1F1F3A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { color: '#F9FAFB', fontSize: 20, fontWeight: '700' },
  modalClose: { color: '#9CA3AF', fontSize: 24, padding: 4 },
  modalSubtitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 20 },
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingBottom: 16 },
  levelButton: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  levelUnlocked: { backgroundColor: '#374151' },
  levelCurrent: { backgroundColor: '#6366F1', borderWidth: 2, borderColor: '#A5B4FC' },
  levelLocked: { backgroundColor: '#1F2937' },
  levelNumber: { color: '#F9FAFB', fontSize: 18, fontWeight: '700' },
  levelStars: { fontSize: 10, marginTop: 2 },
  playButton: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  playButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
