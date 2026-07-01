import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AppNotification, NotificationsPage } from '../../services/api';

const TYPE_ICONS: Record<string, string> = {
  STAGE_OPEN: '🏆',
  STAGE_CLOSING: '⏳',
  ELIMINATION: '❌',
  PRIZE_WON: '💰',
  FRIEND_REQUEST: '👥',
  CHALLENGE: '⚔️',
  SYSTEM: '🔔',
  PROMOTION: '🎁',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const NotificationsScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(1),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    // Optimistically flip the notification to read so the change persists visually
    // immediately; the invalidate on settle reconciles with the backend.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<NotificationsPage>(['notifications']);
      if (previous) {
        queryClient.setQueryData<NotificationsPage>(['notifications'], {
          ...previous,
          notifications: previous.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
          unread_count: Math.max(0, previous.unread_count - 1),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsRead = (item: AppNotification) => {
    if (!item.read) markReadMutation.mutate(item.id);
  };

  const notifications = notificationsQuery.data?.notifications ?? [];

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notificationRow, !item.read && styles.unread]}
      onPress={() => markAsRead(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
      <View style={styles.content}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (notificationsQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Notifications</Text>
        <ActivityIndicator color="#6C3CE1" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isFetching}
            onRefresh={() => notificationsQuery.refetch()}
            tintColor="#6C3CE1"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {notificationsQuery.error ? 'Could not load notifications.' : 'No notifications yet'}
            </Text>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F3A',
  },
  unread: {
    backgroundColor: '#1A1A2E',
  },
  icon: {
    fontSize: 24,
    marginRight: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  notifTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  body: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  timeAgo: {
    color: '#6B7280',
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C3CE1',
    marginTop: 6,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
  loader: {
    marginTop: 40,
  },
});
