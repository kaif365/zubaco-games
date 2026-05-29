import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';

interface Notification {
  id: string;
  icon: string;
  title: string;
  body: string;
  timeAgo: string;
  read: boolean;
}

// TODO: Replace with API call using @tanstack/react-query
const PLACEHOLDER_NOTIFICATIONS: Notification[] = [
  { id: '1', icon: '🏆', title: 'Tournament Starting', body: 'The Speed Challenge starts in 10 minutes!', timeAgo: '5 min ago', read: false },
  { id: '2', icon: '💰', title: 'Winnings Credited', body: '₹50 has been added to your wallet.', timeAgo: '2 hours ago', read: false },
  { id: '3', icon: '👥', title: 'New Referral', body: 'Your friend Arjun just joined Zubaco!', timeAgo: '5 hours ago', read: true },
  { id: '4', icon: '🎮', title: 'New Game Available', body: 'Try the new Logic Reflector game now.', timeAgo: '1 day ago', read: true },
  { id: '5', icon: '⚡', title: 'Energy Refilled', body: 'Your energy is fully restored. Play now!', timeAgo: '2 days ago', read: true },
];

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(PLACEHOLDER_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Refetch notifications from API
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const markAsRead = (id: string) => {
    // TODO: Call API to mark notification as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationRow, !item.read && styles.unread]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{item.icon}</Text>
      <View style={styles.content}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

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
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C3CE1"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notifications yet</Text>
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
});
