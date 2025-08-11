import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationEvent, NotificationType } from '../types/notifications';
import { useNotificationHistory } from '../hooks/useNotificationHistory';
import { useAuth } from '../contexts/AuthContext';

type FilterTab = 'all' | 'unread' | 'friends' | 'achievements';

interface NotificationFilter {
  tab: FilterTab;
  searchQuery?: string;
}

const { width } = Dimensions.get('window');

export const NotificationCenterScreen: React.FC = () => {
  // Hooks
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    filteredNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refreshHistory,
    bulkMarkAsRead,
    bulkDelete,
    setFilter,
    exportHistory,
  } = useNotificationHistory(user?.id);

  // State
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const searchHeight = useRef(new Animated.Value(0)).current;
  const selectionBarHeight = useRef(new Animated.Value(0)).current;

  // Filter tabs configuration
  const filterTabs = useMemo(() => [
    { key: 'all' as FilterTab, label: 'All', count: notifications.length },
    { key: 'unread' as FilterTab, label: 'Unread', count: unreadCount },
    { key: 'friends' as FilterTab, label: 'Friends', count: notifications.filter(n => ['friend_request', 'friend_accepted', 'friend_post'].includes(n.type)).length },
    { key: 'achievements' as FilterTab, label: 'Achievements', count: notifications.filter(n => ['achievement_unlocked', 'cuisine_milestone'].includes(n.type)).length },
  ], [notifications, unreadCount]);

  // Apply filters when tab or search changes
  useEffect(() => {
    let types: NotificationType[] | undefined;
    
    switch (activeTab) {
      case 'friends':
        types = ['friend_request', 'friend_accepted', 'friend_post', 'post_like', 'post_comment'];
        break;
      case 'achievements':
        types = ['achievement_unlocked', 'cuisine_milestone'];
        break;
      case 'unread':
        // Filter by read status will be handled by the hook
        break;
    }

    setFilter({
      types,
      read: activeTab === 'unread' ? false : undefined,
      searchQuery: searchQuery.trim() || undefined,
    });
  }, [activeTab, searchQuery, setFilter]);

  // Handle tab change
  const handleTabChange = useCallback((tab: FilterTab) => {
    setActiveTab(tab);
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  }, []);

  // Handle search toggle
  const toggleSearch = useCallback(() => {
    const newShowSearch = !showSearch;
    setShowSearch(newShowSearch);
    
    Animated.timing(searchHeight, {
      toValue: newShowSearch ? 50 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (!newShowSearch) {
      setSearchQuery('');
    }
  }, [showSearch, searchHeight]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshHistory();
    } finally {
      setRefreshing(false);
    }
  }, [refreshHistory]);

  // Handle notification press
  const handleNotificationPress = useCallback(async (notification: NotificationEvent) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedNotifications);
      if (newSelected.has(notification.id)) {
        newSelected.delete(notification.id);
      } else {
        newSelected.add(notification.id);
      }
      setSelectedNotifications(newSelected);
      return;
    }

    // Mark as read if unread
    if (!notification.readAt) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Handle navigation based on notification type
    handleNotificationNavigation(notification);
  }, [isSelectionMode, selectedNotifications, markAsRead]);

  // Handle notification navigation
  const handleNotificationNavigation = useCallback((notification: NotificationEvent) => {
    const { type, data } = notification;
    
    switch (type) {
      case 'friend_request':
        // Navigate to friends screen
        console.log('Navigate to friends screen');
        break;
      case 'friend_post':
      case 'post_like':
      case 'post_comment':
        // Navigate to specific post
        console.log('Navigate to post:', data?.postId);
        break;
      case 'achievement_unlocked':
      case 'cuisine_milestone':
        // Navigate to achievements screen
        console.log('Navigate to achievements screen');
        break;
      case 'weekly_progress':
        // Navigate to progress screen
        console.log('Navigate to progress screen');
        break;
      default:
        console.log('No specific navigation for notification type:', type);
    }
  }, []);

  // Handle long press for selection mode
  const handleLongPress = useCallback((notification: NotificationEvent) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedNotifications(new Set([notification.id]));
      
      Animated.timing(selectionBarHeight, {
        toValue: 60,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isSelectionMode, selectionBarHeight]);

  // Exit selection mode
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNotifications(new Set());
    
    Animated.timing(selectionBarHeight, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [selectionBarHeight]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  }, [markAllAsRead]);

  // Handle bulk actions
  const handleBulkMarkAsRead = useCallback(async () => {
    try {
      await bulkMarkAsRead(Array.from(selectedNotifications));
      exitSelectionMode();
      Alert.alert('Success', `${selectedNotifications.size} notifications marked as read`);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  }, [bulkMarkAsRead, selectedNotifications, exitSelectionMode]);

  const handleBulkDelete = useCallback(async () => {
    Alert.alert(
      'Delete Notifications',
      `Delete ${selectedNotifications.size} selected notifications?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bulkDelete(Array.from(selectedNotifications));
              exitSelectionMode();
              Alert.alert('Success', 'Notifications deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notifications');
            }
          },
        },
      ]
    );
  }, [bulkDelete, selectedNotifications, exitSelectionMode]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const exportData = await exportHistory();
      // In a real app, you'd use a sharing library or save to files
      Alert.alert('Export Complete', 'Notification history exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export notification history');
    }
  }, [exportHistory]);

  // Load more notifications
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Render notification item
  const renderNotificationItem = useCallback(({ item: notification }: { item: NotificationEvent }) => {
    const isSelected = selectedNotifications.has(notification.id);
    const isUnread = !notification.readAt;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.unreadNotification,
          isSelected && styles.selectedNotification,
        ]}
        onPress={() => handleNotificationPress(notification)}
        onLongPress={() => handleLongPress(notification)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {isSelectionMode && (
            <View style={styles.selectionIndicator}>
              <Ionicons 
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} 
                size={24} 
                color={isSelected ? '#4A90E2' : '#CCCCCC'} 
              />
            </View>
          )}
          
          <View style={styles.notificationIcon}>
            <Ionicons 
              name={getNotificationIcon(notification.type)} 
              size={24} 
              color={getNotificationColor(notification.type)} 
            />
          </View>
          
          <View style={styles.notificationBody}>
            <Text style={[styles.notificationTitle, isUnread && styles.unreadText]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationText} numberOfLines={2}>
              {notification.body}
            </Text>
            <Text style={styles.notificationTime}>
              {formatNotificationTime(notification.sentAt)}
            </Text>
          </View>
          
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  }, [selectedNotifications, isSelectionMode, handleNotificationPress, handleLongPress]);

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'unread' 
          ? "You're all caught up! No unread notifications."
          : "We'll notify you when something interesting happens."
        }
      </Text>
    </View>
  ), [activeTab]);

  // Render filter tabs
  const renderFilterTabs = useCallback(() => (
    <View style={styles.filterTabs}>
      {filterTabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.filterTab,
            activeTab === tab.key && styles.activeFilterTab,
          ]}
          onPress={() => handleTabChange(tab.key)}
        >
          <Text style={[
            styles.filterTabText,
            activeTab === tab.key && styles.activeFilterTabText,
          ]}>
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <View style={styles.filterTabBadge}>
              <Text style={styles.filterTabBadgeText}>{tab.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  ), [filterTabs, activeTab, handleTabChange]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleSearch} style={styles.headerButton}>
              <Ionicons name="search" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
              <Ionicons name="checkmark-done" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchContainer, { height: searchHeight }]}>
        {showSearch && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notifications..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Selection Bar */}
      <Animated.View style={[styles.selectionBar, { height: selectionBarHeight }]}>
        {isSelectionMode && (
          <View style={styles.selectionBarContent}>
            <TouchableOpacity onPress={exitSelectionMode} style={styles.selectionBarButton}>
              <Ionicons name="close" size={24} color="#666666" />
            </TouchableOpacity>
            <Text style={styles.selectionBarText}>
              {selectedNotifications.size} selected
            </Text>
            <View style={styles.selectionBarActions}>
              <TouchableOpacity onPress={handleBulkMarkAsRead} style={styles.selectionBarButton}>
                <Ionicons name="checkmark" size={24} color="#4A90E2" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} style={styles.selectionBarButton}>
                <Ionicons name="trash" size={24} color="#E24A4A" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// Helper functions
function getNotificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'friend_request':
      return 'person-add';
    case 'friend_accepted':
      return 'people';
    case 'friend_post':
      return 'restaurant';
    case 'post_like':
      return 'heart';
    case 'post_comment':
      return 'chatbubble';
    case 'achievement_unlocked':
      return 'trophy';
    case 'cuisine_milestone':
      return 'star';
    case 'weekly_progress':
      return 'stats-chart';
    case 'new_cuisine_available':
      return 'globe';
    case 'reminder':
      return 'time';
    case 'system_announcement':
      return 'megaphone';
    default:
      return 'notifications';
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return '#4A90E2';
    case 'friend_post':
      return '#7ED321';
    case 'post_like':
      return '#E24A4A';
    case 'post_comment':
      return '#9013FE';
    case 'achievement_unlocked':
    case 'cuisine_milestone':
      return '#F5A623';
    case 'weekly_progress':
      return '#50C878';
    case 'new_cuisine_available':
      return '#FF6B6B';
    case 'reminder':
      return '#FFA500';
    case 'system_announcement':
      return '#1A1A1A';
    default:
      return '#666666';
  }
}

function formatNotificationTime(date?: Date): string {
  if (!date) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    gap: 4,
  },
  activeFilterTab: {
    backgroundColor: '#4A90E2',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  filterTabBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  selectionBar: {
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    overflow: 'hidden',
  },
  selectionBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  selectionBarButton: {
    padding: 4,
  },
  selectionBarText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  selectionBarActions: {
    flexDirection: 'row',
    gap: 16,
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FE',
  },
  selectedNotification: {
    backgroundColor: '#E3F2FD',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  selectionIndicator: {
    marginRight: 12,
    paddingTop: 2,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginTop: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
});