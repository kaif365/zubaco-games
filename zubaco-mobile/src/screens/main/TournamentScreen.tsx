import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

export function TournamentScreen() {
  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api.getActiveSeasons(),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tournaments</Text>
      <Text style={styles.subtitle}>Compete in seasonal eliminations</Text>
      {/* Tournament cards will go here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 20, paddingTop: 60 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
});
