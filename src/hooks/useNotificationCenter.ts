import { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { NotificationEvent, NotificationType, NotificationFilter, NotificationBatch } from '../types/notifications';
import { useNotificationHistory } from './useNotificationHistory';
import { SmartNotificationEngine, shouldSendNotificationNow, personalizeNotificationContent } from '../lib/smartNotifications';
import { useAuth } from '../contexts/AuthContext';

export interface NotificationCenterState {
  selectedNotifications: Set<string>;
  isSelectionMode: boolean;
  activeFilter: NotificationFilter;
  searchQuery: string;
  sortBy: 'date' | 'type' | 'priority';
  sortOrder: 'asc' | 'desc';
  showUnreadOnly: boolean;
  autoMarkRead: boolean;
}

export interface NotificationCenterActions {
  // Selection management
  selectNotification: (id: string) => void;
  selectAllNotifications: () => void;
  clearSelection: () => void;
  toggleSelectionMode: () => void;
  
  // Batch operations
  bulkMarkAsRead: (ids: string[]) => Promise<void>;
  bulkMarkAsUnread: (ids: string[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkArchive: (ids: string[]) => Promise<void>;
  bulkSnooze: (ids: string[], snoozeUntil: Date) => Promise<void>;
  
  // Filtering and search
  setFilter: (filter: Partial<NotificationFilter>) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'date' | 'type' | 'priority') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Notification management
  snoozeNotification: (id: string, until: Date) => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  pinNotification: (id: string) => Promise<void>;
  unpinNotification: (id: string) => Promise<void>;
  
  // Smart features
  markAllReadBefore: (date: Date) => Promise<void>;
  deleteOlderThan: (days: number) => Promise<void>;
  autoOrganize: () => Promise<void>;
  suggestActions: (notification: NotificationEvent) => SuggestedAction[];
  
  // Analytics
  getNotificationStats: () => Promise<NotificationStats>;
  getEngagementMetrics: () => Promise<EngagementMetrics>;
}

export interface SuggestedAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void>;
  icon: string;
  confidence: number; // 0-1
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  snoozed: number;
  pinned: number;
  byType: Record<NotificationType, number>;
  byDay: Record<string, number>; // Last 7 days
  averageResponseTime: number; // in minutes
  engagementRate: number;
}

export interface EngagementMetrics {
  totalNotifications: number;
  openedNotifications: number;
  clickedNotifications: number;
  repliedNotifications: number;
  sharedNotifications: number;
  deletedNotifications: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  shareRate: number;
  deleteRate: number;
}

export function useNotificationCenter(userId?: string) {
  const { user } = useAuth();
  const currentUserId = userId || user?.id;

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    filteredNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refreshHistory,
    bulkMarkAsRead: historyBulkMarkAsRead,
    bulkDelete: historyBulkDelete,
    setFilter: setHistoryFilter,
    exportHistory,
  } = useNotificationHistory(currentUserId);

  // State management
  const [state, setState] = useState<NotificationCenterState>({
    selectedNotifications: new Set(),
    isSelectionMode: false,
    activeFilter: {},
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',
    showUnreadOnly: false,
    autoMarkRead: false,
  });

  const [snoozedNotifications, setSnoozedNotifications] = useState<Map<string, Date>>(new Map());
  const [pinnedNotifications, setPinnedNotifications] = useState<Set<string>>(new Set());
  const [archivedNotifications, setArchivedNotifications] = useState<Set<string>>(new Set());

  // Initialize smart notification engine
  const smartEngine = useMemo(() => SmartNotificationEngine.getInstance(), []);

  // Load extended notification data
  useEffect(() => {
    if (currentUserId) {
      loadExtendedData();
    }
  }, [currentUserId]);

  const loadExtendedData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Load snoozed notifications
      const { data: snoozed, error: snoozedError } = await supabase
        .from('notification_history')
        .select('id, snoozed_until')
        .eq('user_id', currentUserId)
        .not('snoozed_until', 'is', null);

      if (!snoozedError && snoozed) {
        const snoozedMap = new Map<string, Date>();
        snoozed.forEach(item => {
          if (item.snoozed_until) {
            snoozedMap.set(item.id, new Date(item.snoozed_until));
          }
        });
        setSnoozedNotifications(snoozedMap);
      }

      // Load pinned notifications
      const { data: pinned, error: pinnedError } = await supabase
        .from('notification_history')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('is_pinned', true);

      if (!pinnedError && pinned) {
        setPinnedNotifications(new Set(pinned.map(item => item.id)));
      }

      // Load archived notifications
      const { data: archived, error: archivedError } = await supabase
        .from('notification_history')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('is_archived', true);

      if (!archivedError && archived) {
        setArchivedNotifications(new Set(archived.map(item => item.id)));
      }

    } catch (error) {
      console.error('Error loading extended notification data:', error);
    }
  }, [currentUserId]);

  // Selection management
  const selectNotification = useCallback((id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedNotifications);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return {
        ...prev,
        selectedNotifications: newSelected,
        isSelectionMode: newSelected.size > 0 || prev.isSelectionMode,
      };
    });
  }, []);

  const selectAllNotifications = useCallback(() => {
    const allIds = new Set(filteredNotifications.map(n => n.id));
    setState(prev => ({
      ...prev,
      selectedNotifications: allIds,
      isSelectionMode: true,
    }));
  }, [filteredNotifications]);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedNotifications: new Set(),
      isSelectionMode: false,
    }));
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSelectionMode: !prev.isSelectionMode,
      selectedNotifications: prev.isSelectionMode ? new Set() : prev.selectedNotifications,
    }));
  }, []);

  // Batch operations
  const bulkMarkAsRead = useCallback(async (ids: string[]) => {
    try {
      await historyBulkMarkAsRead(ids);
      clearSelection();
    } catch (error) {
      console.error('Error bulk marking as read:', error);
      throw error;
    }
  }, [historyBulkMarkAsRead, clearSelection]);

  const bulkMarkAsUnread = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ read_at: null })
        .in('id', ids)
        .eq('user_id', currentUserId);

      if (error) throw error;
      
      await refreshHistory();
      clearSelection();
    } catch (error) {
      console.error('Error bulk marking as unread:', error);
      throw error;
    }
  }, [currentUserId, refreshHistory, clearSelection]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      await historyBulkDelete(ids);
      clearSelection();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      throw error;
    }
  }, [historyBulkDelete, clearSelection]);

  const bulkArchive = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ is_archived: true })
        .in('id', ids)
        .eq('user_id', currentUserId);

      if (error) throw error;

      // Update local state
      setArchivedNotifications(prev => {
        const newArchived = new Set(prev);
        ids.forEach(id => newArchived.add(id));
        return newArchived;
      });

      await refreshHistory();
      clearSelection();
    } catch (error) {
      console.error('Error bulk archiving:', error);
      throw error;
    }
  }, [currentUserId, refreshHistory, clearSelection]);

  const bulkSnooze = useCallback(async (ids: string[], snoozeUntil: Date) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ snoozed_until: snoozeUntil.toISOString() })
        .in('id', ids)
        .eq('user_id', currentUserId);

      if (error) throw error;

      // Update local state
      setSnoozedNotifications(prev => {
        const newSnoozed = new Map(prev);
        ids.forEach(id => newSnoozed.set(id, snoozeUntil));
        return newSnoozed;
      });

      await refreshHistory();
      clearSelection();
    } catch (error) {
      console.error('Error bulk snoozing:', error);
      throw error;
    }
  }, [currentUserId, refreshHistory, clearSelection]);

  // Individual notification operations
  const snoozeNotification = useCallback(async (id: string, until: Date) => {
    await bulkSnooze([id], until);
  }, [bulkSnooze]);

  const archiveNotification = useCallback(async (id: string) => {
    await bulkArchive([id]);
  }, [bulkArchive]);

  const pinNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ is_pinned: true })
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      setPinnedNotifications(prev => new Set(prev).add(id));
      await refreshHistory();
    } catch (error) {
      console.error('Error pinning notification:', error);
      throw error;
    }
  }, [currentUserId, refreshHistory]);

  const unpinNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ is_pinned: false })
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      setPinnedNotifications(prev => {
        const newPinned = new Set(prev);
        newPinned.delete(id);
        return newPinned;
      });
      await refreshHistory();
    } catch (error) {
      console.error('Error unpinning notification:', error);
      throw error;
    }
  }, [currentUserId, refreshHistory]);

  // Smart operations
  const markAllReadBefore = useCallback(async (date: Date) => {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', currentUserId)
        .is('read_at', null)
        .lt('sent_at', date.toISOString());

      if (error) throw error;
      await refreshHistory();
    } catch (error) {
      console.error('Error marking all read before date:', error);
      throw error;
    }
  }, [currentUserId, refreshHistory]);

  const deleteOlderThan = useCallback(async (days: number) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('user_id', currentUserId)
        .lt('sent_at', cutoffDate.toISOString());

      if (error) throw error;
      await refreshHistory();
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }, [currentUserId, refreshHistory]);

  const autoOrganize = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Auto-archive read notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: oldRead, error: oldReadError } = await supabase
        .from('notification_history')
        .select('id')
        .eq('user_id', currentUserId)
        .not('read_at', 'is', null)
        .lt('sent_at', thirtyDaysAgo.toISOString())
        .eq('is_archived', false);

      if (!oldReadError && oldRead && oldRead.length > 0) {
        const oldIds = oldRead.map(n => n.id);
        await bulkArchive(oldIds);
      }

      // Auto-mark system announcements as read after 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: oldAnnouncements, error: announcementsError } = await supabase
        .from('notification_history')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('type', 'system_announcement')
        .is('read_at', null)
        .lt('sent_at', sevenDaysAgo.toISOString());

      if (!announcementsError && oldAnnouncements && oldAnnouncements.length > 0) {
        const announcementIds = oldAnnouncements.map(n => n.id);
        await bulkMarkAsRead(announcementIds);
      }

      // Unsnooze expired snoozed notifications
      const now = new Date();
      const expiredSnoozed: string[] = [];
      snoozedNotifications.forEach((snoozeDate, id) => {
        if (snoozeDate <= now) {
          expiredSnoozed.push(id);
        }
      });

      if (expiredSnoozed.length > 0) {
        const { error: unsnoozeError } = await supabase
          .from('notification_history')
          .update({ snoozed_until: null })
          .in('id', expiredSnoozed);

        if (!unsnoozeError) {
          setSnoozedNotifications(prev => {
            const newSnoozed = new Map(prev);
            expiredSnoozed.forEach(id => newSnoozed.delete(id));
            return newSnoozed;
          });
        }
      }

      await refreshHistory();
    } catch (error) {
      console.error('Error auto-organizing notifications:', error);
      throw error;
    }
  }, [currentUserId, bulkArchive, bulkMarkAsRead, snoozedNotifications, refreshHistory]);

  const suggestActions = useCallback((notification: NotificationEvent): SuggestedAction[] => {
    const suggestions: SuggestedAction[] = [];

    // Based on notification type
    switch (notification.type) {
      case 'friend_request':
        suggestions.push({
          id: 'view_profile',
          label: 'View Profile',
          description: 'Check out their profile before deciding',
          action: async () => {
            // Navigate to profile
          },
          icon: 'person',
          confidence: 0.9,
        });
        break;

      case 'achievement_unlocked':
        suggestions.push({
          id: 'share_achievement',
          label: 'Share Achievement',
          description: 'Share your accomplishment with friends',
          action: async () => {
            // Share achievement
          },
          icon: 'share',
          confidence: 0.8,
        });
        break;

      case 'friend_post':
        suggestions.push({
          id: 'like_post',
          label: 'Like Post',
          description: 'Show support for your friend\'s post',
          action: async () => {
            // Like the post
          },
          icon: 'heart',
          confidence: 0.7,
        });
        break;
    }

    // Based on age
    if (notification.sentAt && notification.sentAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      suggestions.push({
        id: 'archive',
        label: 'Archive',
        description: 'This notification is over a week old',
        action: async () => {
          await archiveNotification(notification.id);
        },
        icon: 'archive',
        confidence: 0.6,
      });
    }

    // Based on read status
    if (!notification.readAt) {
      suggestions.push({
        id: 'mark_read',
        label: 'Mark as Read',
        description: 'Mark this notification as read',
        action: async () => {
          await markAsRead(notification.id);
        },
        icon: 'checkmark-circle',
        confidence: 0.5,
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, [archiveNotification, markAsRead]);

  // Analytics
  const getNotificationStats = useCallback(async (): Promise<NotificationStats> => {
    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data: allNotifications, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', currentUserId);

      if (error) throw error;

      const notifications = allNotifications || [];
      const byType: Record<NotificationType, number> = {} as any;
      const byDay: Record<string, number> = {};
      let totalResponseTime = 0;
      let responseCount = 0;
      let engagedCount = 0;

      // Initialize byDay for last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        byDay[dateStr] = 0;
      }

      notifications.forEach(notification => {
        // Count by type
        byType[notification.type as NotificationType] = (byType[notification.type as NotificationType] || 0) + 1;

        // Count by day
        const sentDate = new Date(notification.sent_at).toISOString().split('T')[0];
        if (byDay.hasOwnProperty(sentDate)) {
          byDay[sentDate]++;
        }

        // Calculate response time
        if (notification.read_at) {
          const responseTime = new Date(notification.read_at).getTime() - new Date(notification.sent_at).getTime();
          totalResponseTime += responseTime / (1000 * 60); // Convert to minutes
          responseCount++;
        }

        // Count engagement
        if (notification.clicked_at || notification.action_taken) {
          engagedCount++;
        }
      });

      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read_at).length,
        read: notifications.filter(n => n.read_at).length,
        archived: notifications.filter(n => n.is_archived).length,
        snoozed: notifications.filter(n => n.snoozed_until && new Date(n.snoozed_until) > new Date()).length,
        pinned: notifications.filter(n => n.is_pinned).length,
        byType,
        byDay,
        averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
        engagementRate: notifications.length > 0 ? engagedCount / notifications.length : 0,
      };

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }, [currentUserId]);

  const getEngagementMetrics = useCallback(async (): Promise<EngagementMetrics> => {
    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data: notifications, error } = await supabase
        .from('notification_history')
        .select('read_at, clicked_at, action_taken, reply_sent, shared_at, deleted_at')
        .eq('user_id', currentUserId);

      if (error) throw error;

      const total = notifications?.length || 0;
      if (total === 0) {
        return {
          totalNotifications: 0,
          openedNotifications: 0,
          clickedNotifications: 0,
          repliedNotifications: 0,
          sharedNotifications: 0,
          deletedNotifications: 0,
          openRate: 0,
          clickRate: 0,
          replyRate: 0,
          shareRate: 0,
          deleteRate: 0,
        };
      }

      const opened = notifications.filter(n => n.read_at).length;
      const clicked = notifications.filter(n => n.clicked_at).length;
      const replied = notifications.filter(n => n.reply_sent).length;
      const shared = notifications.filter(n => n.shared_at).length;
      const deleted = notifications.filter(n => n.deleted_at).length;

      return {
        totalNotifications: total,
        openedNotifications: opened,
        clickedNotifications: clicked,
        repliedNotifications: replied,
        sharedNotifications: shared,
        deletedNotifications: deleted,
        openRate: opened / total,
        clickRate: clicked / total,
        replyRate: replied / total,
        shareRate: shared / total,
        deleteRate: deleted / total,
      };
    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      throw error;
    }
  }, [currentUserId]);

  // Filtering and sorting
  const setFilter = useCallback((filter: Partial<NotificationFilter>) => {
    setState(prev => ({
      ...prev,
      activeFilter: { ...prev.activeFilter, ...filter },
    }));
    setHistoryFilter(filter);
  }, [setHistoryFilter]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setSortBy = useCallback((sortBy: 'date' | 'type' | 'priority') => {
    setState(prev => ({ ...prev, sortBy }));
  }, []);

  const setSortOrder = useCallback((order: 'asc' | 'desc') => {
    setState(prev => ({ ...prev, sortOrder: order }));
  }, []);

  // Computed values
  const processedNotifications = useMemo(() => {
    let processed = [...filteredNotifications];

    // Apply search query
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      processed = processed.filter(notification =>
        notification.title.toLowerCase().includes(query) ||
        notification.body.toLowerCase().includes(query)
      );
    }

    // Apply show unread only filter
    if (state.showUnreadOnly) {
      processed = processed.filter(n => !n.readAt);
    }

    // Apply sorting
    processed.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sortBy) {
        case 'date':
          comparison = (a.sentAt?.getTime() || 0) - (b.sentAt?.getTime() || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.data?.priority as keyof typeof priorityOrder] || 1;
          const bPriority = priorityOrder[b.data?.priority as keyof typeof priorityOrder] || 1;
          comparison = bPriority - aPriority;
          break;
      }
      
      return state.sortOrder === 'asc' ? comparison : -comparison;
    });

    return processed;
  }, [filteredNotifications, state.searchQuery, state.showUnreadOnly, state.sortBy, state.sortOrder]);

  const selectedCount = state.selectedNotifications.size;
  const allSelected = selectedCount === processedNotifications.length && processedNotifications.length > 0;

  return {
    // Data
    notifications: processedNotifications,
    allNotifications: notifications,
    unreadCount,
    selectedCount,
    allSelected,
    snoozedNotifications,
    pinnedNotifications,
    archivedNotifications,

    // State
    loading,
    hasMore,
    state,

    // Selection management
    selectNotification,
    selectAllNotifications,
    clearSelection,
    toggleSelectionMode,

    // Batch operations
    bulkMarkAsRead,
    bulkMarkAsUnread,
    bulkDelete,
    bulkArchive,
    bulkSnooze,

    // Individual operations
    markAsRead,
    markAsUnread,
    deleteNotification,
    snoozeNotification,
    archiveNotification,
    pinNotification,
    unpinNotification,

    // Smart operations
    markAllReadBefore,
    deleteOlderThan,
    autoOrganize,
    suggestActions,

    // Filtering and search
    setFilter,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setShowUnreadOnly: (show: boolean) => setState(prev => ({ ...prev, showUnreadOnly: show })),
    setAutoMarkRead: (auto: boolean) => setState(prev => ({ ...prev, autoMarkRead: auto })),

    // Analytics
    getNotificationStats,
    getEngagementMetrics,

    // Utility
    loadMore,
    refreshHistory,
    exportHistory,
  };
}