import { useState, useEffect, useCallback, useMemo } from 'react';
import { NotificationEvent, NotificationType } from '../types/notifications';
import { 
  getNotificationHistory as getStoredHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  storeNotification,
  cleanupOldNotifications,
  getNotificationsByType
} from '../lib/notificationStorage';

interface NotificationFilter {
  types?: NotificationType[];
  read?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}

interface UseNotificationHistoryReturn {
  // State
  notifications: NotificationEvent[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  
  // Filtered and sorted data
  filteredNotifications: NotificationEvent[];
  groupedNotifications: Record<string, NotificationEvent[]>;
  
  // Actions
  refreshHistory: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  searchNotifications: (query: string) => Promise<NotificationEvent[]>;
  loadMore: () => Promise<void>;
  
  // Filtering and sorting
  setFilter: (filter: NotificationFilter) => void;
  setSortOrder: (order: 'newest' | 'oldest' | 'unread') => void;
  
  // Bulk actions
  bulkMarkAsRead: (notificationIds: string[]) => Promise<void>;
  bulkDelete: (notificationIds: string[]) => Promise<void>;
  
  // Utilities
  getNotificationsByDate: (date: Date) => NotificationEvent[];
  getNotificationsByType: (type: NotificationType) => Promise<NotificationEvent[]>;
  exportHistory: () => Promise<string>;
  clearHistory: () => Promise<void>;
}

const PAGE_SIZE = 20;

export const useNotificationHistory = (userId?: string): UseNotificationHistoryReturn => {
  // State
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Filter and sort state
  const [filter, setFilterState] = useState<NotificationFilter>({});
  const [sortOrder, setSortOrderState] = useState<'newest' | 'oldest' | 'unread'>('newest');

  // Load initial data on mount
  useEffect(() => {
    if (userId) {
      refreshHistory();
      loadUnreadCount();
    }
  }, [userId]);

  // Refresh notification history
  const refreshHistory = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const history = await getStoredHistory(PAGE_SIZE * (currentPage + 1));
      setNotifications(history);
      setHasMore(history.length === PAGE_SIZE * (currentPage + 1));
      setCurrentPage(0); // Reset to first page
    } catch (err) {
      setError('Failed to load notification history');
      console.error('Error loading notification history:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, currentPage]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, []);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !userId) return;
    
    setLoading(true);
    
    try {
      const nextPage = currentPage + 1;
      const allHistory = await getStoredHistory(PAGE_SIZE * (nextPage + 1));
      
      setNotifications(allHistory);
      setCurrentPage(nextPage);
      setHasMore(allHistory.length === PAGE_SIZE * (nextPage + 1));
    } catch (err) {
      setError('Failed to load more notifications');
      console.error('Error loading more notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, userId, currentPage]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, readAt: new Date() }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          readAt: notification.readAt || new Date() 
        }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // Find notification to check if it's unread
      const notification = notifications.find(n => n.id === notificationId);
      const wasUnread = notification && !notification.readAt;
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if it was unread
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Note: This is a soft delete - notification is removed from view
      // but may still exist in storage. Implement hard delete if needed.
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  // Search notifications
  const searchNotifications = useCallback(async (query: string): Promise<NotificationEvent[]> => {
    if (!query.trim()) return notifications;
    
    const searchTerm = query.toLowerCase();
    
    return notifications.filter(notification => 
      notification.title.toLowerCase().includes(searchTerm) ||
      notification.body.toLowerCase().includes(searchTerm) ||
      notification.type.toLowerCase().includes(searchTerm)
    );
  }, [notifications]);

  // Set filter
  const setFilter = useCallback((newFilter: NotificationFilter) => {
    setFilterState(newFilter);
  }, []);

  // Set sort order
  const setSortOrder = useCallback((order: 'newest' | 'oldest' | 'unread') => {
    setSortOrderState(order);
  }, []);

  // Bulk mark as read
  const bulkMarkAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const promises = notificationIds.map(id => markNotificationAsRead(id));
      await Promise.all(promises);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, readAt: new Date() }
            : notification
        )
      );
      
      // Update unread count
      const unreadIds = notificationIds.filter(id => {
        const notification = notifications.find(n => n.id === id);
        return notification && !notification.readAt;
      });
      setUnreadCount(prev => Math.max(0, prev - unreadIds.length));
    } catch (err) {
      console.error('Error in bulk mark as read:', err);
      throw err;
    }
  }, [notifications]);

  // Bulk delete
  const bulkDelete = useCallback(async (notificationIds: string[]) => {
    try {
      // Count unread notifications being deleted
      const unreadBeingDeleted = notificationIds.filter(id => {
        const notification = notifications.find(n => n.id === id);
        return notification && !notification.readAt;
      }).length;
      
      // Remove from local state
      setNotifications(prev => 
        prev.filter(notification => !notificationIds.includes(notification.id))
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - unreadBeingDeleted));
    } catch (err) {
      console.error('Error in bulk delete:', err);
      throw err;
    }
  }, [notifications]);

  // Get notifications by date
  const getNotificationsByDate = useCallback((date: Date): NotificationEvent[] => {
    const targetDate = date.toDateString();
    
    return notifications.filter(notification => {
      const notificationDate = notification.sentAt?.toDateString();
      return notificationDate === targetDate;
    });
  }, [notifications]);

  // Get notifications by type
  const getNotificationsByTypeAsync = useCallback(async (type: NotificationType): Promise<NotificationEvent[]> => {
    try {
      return await getNotificationsByType(type, 50);
    } catch (err) {
      console.error('Error getting notifications by type:', err);
      return [];
    }
  }, []);

  // Export history as JSON
  const exportHistory = useCallback(async (): Promise<string> => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        totalNotifications: notifications.length,
        unreadCount,
        notifications: notifications.map(notification => ({
          ...notification,
          sentAt: notification.sentAt?.toISOString(),
          readAt: notification.readAt?.toISOString(),
          scheduledFor: notification.scheduledFor?.toISOString(),
        }))
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (err) {
      console.error('Error exporting history:', err);
      throw err;
    }
  }, [notifications, unreadCount, userId]);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      // This would implement a clear all function
      // For now, just clear local state
      setNotifications([]);
      setUnreadCount(0);
      
      // Optionally cleanup old notifications
      await cleanupOldNotifications(0); // Clear all
    } catch (err) {
      console.error('Error clearing history:', err);
      throw err;
    }
  }, []);

  // Filtered notifications based on current filter
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];
    
    // Filter by types
    if (filter.types && filter.types.length > 0) {
      result = result.filter(notification => 
        filter.types!.includes(notification.type)
      );
    }
    
    // Filter by read status
    if (filter.read !== undefined) {
      result = result.filter(notification => 
        filter.read ? !!notification.readAt : !notification.readAt
      );
    }
    
    // Filter by date range
    if (filter.dateFrom) {
      result = result.filter(notification => 
        notification.sentAt && notification.sentAt >= filter.dateFrom!
      );
    }
    
    if (filter.dateTo) {
      result = result.filter(notification => 
        notification.sentAt && notification.sentAt <= filter.dateTo!
      );
    }
    
    // Filter by search query
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter(notification =>
        notification.title.toLowerCase().includes(query) ||
        notification.body.toLowerCase().includes(query) ||
        notification.type.toLowerCase().includes(query)
      );
    }
    
    // Sort results
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0);
        case 'oldest':
          return (a.sentAt?.getTime() || 0) - (b.sentAt?.getTime() || 0);
        case 'unread':
          // Unread first, then by date
          if (!a.readAt && b.readAt) return -1;
          if (a.readAt && !b.readAt) return 1;
          return (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [notifications, filter, sortOrder]);

  // Grouped notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationEvent[]> = {};
    
    filteredNotifications.forEach(notification => {
      if (!notification.sentAt) return;
      
      const dateKey = notification.sentAt.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(notification);
    });
    
    return groups;
  }, [filteredNotifications]);

  // Auto-refresh every 30 seconds when app is active
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(() => {
      refreshHistory();
      loadUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [userId, refreshHistory, loadUnreadCount]);

  // Cleanup old notifications periodically
  useEffect(() => {
    const cleanup = async () => {
      try {
        await cleanupOldNotifications(30); // Keep last 30 days
      } catch (err) {
        console.error('Error cleaning up old notifications:', err);
      }
    };
    
    // Run cleanup every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    
    // Run initial cleanup after 5 minutes
    const initialTimeout = setTimeout(cleanup, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    hasMore,
    error,
    
    // Filtered and sorted data
    filteredNotifications,
    groupedNotifications,
    
    // Actions
    refreshHistory,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    searchNotifications,
    loadMore,
    
    // Filtering and sorting
    setFilter,
    setSortOrder,
    
    // Bulk actions
    bulkMarkAsRead,
    bulkDelete,
    
    // Utilities
    getNotificationsByDate,
    getNotificationsByType: getNotificationsByTypeAsync,
    exportHistory,
    clearHistory,
  };
};