import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { 
  NotificationCallback, 
  NotificationSettings, 
  NotificationEvent,
  NotificationType,
  NotificationResponse 
} from '../types/notifications';
import { useNotificationPermissions } from './useNotificationPermissions';
import { 
  initializeNotifications, 
  registerForPushNotifications,
  handleNotificationResponse,
  setBadgeCount,
  getBadgeCount
} from '../lib/notifications';
import { 
  storePushToken, 
  getPushToken, 
  registerTokenWithServer,
  removePushToken
} from '../lib/pushTokens';
import {
  storeNotification,
  getNotificationHistory,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationSettings,
  saveNotificationSettings,
  cleanupOldNotifications
} from '../lib/notificationStorage';

interface UseNotificationsReturn {
  // Permission state
  hasPermission: boolean;
  pushToken: string | null;
  isRegistering: boolean;
  
  // Notification state
  notificationSettings: NotificationSettings | null;
  unreadCount: number;
  notifications: NotificationEvent[];
  
  // Error state
  error: string | null;
  
  // Actions
  requestPermissions: () => Promise<boolean>;
  getNotificationToken: () => Promise<string | null>;
  subscribeToNotifications: (callback: NotificationCallback) => () => void;
  handleIncomingNotification: (notification: Notification) => void;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearError: () => void;
}

export const useNotifications = (userId?: string): UseNotificationsReturn => {
  const { hasPermission, requestPermissions: requestPermissionStatus } = useNotificationPermissions();
  
  // State
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const notificationCallbackRef = useRef<NotificationCallback | null>(null);
  const subscriptionsRef = useRef<Notifications.Subscription[]>([]);

  // Initialize notifications
  useEffect(() => {
    const initialize = async () => {
      try {
        const initialized = await initializeNotifications();
        if (!initialized) {
          setError('Failed to initialize notifications');
        }
      } catch (err) {
        setError('Failed to initialize notifications');
        console.error('Notification initialization error:', err);
      }
    };

    initialize();
  }, []);

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getNotificationSettings();
        setNotificationSettings(settings);
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      }
    };

    loadSettings();
  }, []);

  // Load initial data
  useEffect(() => {
    if (hasPermission && userId) {
      refreshNotifications();
    }
  }, [hasPermission, userId]);

  // Request permissions and get token
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsRegistering(true);

    try {
      const granted = await requestPermissionStatus();
      
      if (granted && userId) {
        const token = await getNotificationToken();
        if (token) {
          await registerTokenWithServer(token, userId);
        }
      }
      
      setIsRegistering(false);
      return granted;
    } catch (err) {
      setError('Failed to request notification permissions');
      console.error('Permission request error:', err);
      setIsRegistering(false);
      return false;
    }
  }, [requestPermissionStatus, userId]);

  // Get notification token
  const getNotificationToken = useCallback(async (): Promise<string | null> => {
    try {
      // Try to get existing token first
      let token = await getPushToken();
      
      if (!token) {
        // Register for new token
        token = await registerForPushNotifications();
        
        if (token && userId) {
          await storePushToken(token, userId);
        }
      }
      
      setPushToken(token);
      return token;
    } catch (err) {
      setError('Failed to get notification token');
      console.error('Token retrieval error:', err);
      return null;
    }
  }, [userId]);

  // Subscribe to notifications
  const subscribeToNotifications = useCallback((callback: NotificationCallback): (() => void) => {
    notificationCallbackRef.current = callback;

    // Subscribe to notification received
    const notificationReceivedSub = Notifications.addNotificationReceivedListener((notification) => {
      handleIncomingNotification(notification);
    });

    // Subscribe to notification response
    const notificationResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response as NotificationResponse);
      
      // Mark as read when user taps
      if (response.notification.request.content.data?.notificationId) {
        markAsRead(response.notification.request.content.data.notificationId);
      }
    });

    // Store subscriptions
    subscriptionsRef.current = [notificationReceivedSub, notificationResponseSub];

    // Return cleanup function
    return () => {
      subscriptionsRef.current.forEach(sub => sub.remove());
      subscriptionsRef.current = [];
      notificationCallbackRef.current = null;
    };
  }, []);

  // Handle incoming notification
  const handleIncomingNotification = useCallback(async (notification: Notification) => {
    try {
      const { title, body, data } = notification.request.content;
      
      const notificationEvent: NotificationEvent = {
        id: notification.request.identifier,
        type: (data?.type as NotificationType) || 'system_announcement',
        userId: userId || '',
        title: title || '',
        body: body || '',
        data: data || {},
        sentAt: new Date(),
      };

      // Store notification
      await storeNotification(notificationEvent);
      
      // Update unread count
      await updateUnreadCount();
      
      // Update badge count
      const newUnreadCount = await getUnreadCount();
      await setBadgeCount(newUnreadCount);
      
      // Call callback if provided
      if (notificationCallbackRef.current) {
        notificationCallbackRef.current(notificationEvent);
      }
      
      // Refresh notifications list
      await refreshNotifications();
    } catch (err) {
      console.error('Error handling incoming notification:', err);
    }
  }, [userId]);

  // Update notification settings
  const updateNotificationSettings = useCallback(async (settings: NotificationSettings): Promise<void> => {
    try {
      await saveNotificationSettings(settings);
      setNotificationSettings(settings);
    } catch (err) {
      setError('Failed to update notification settings');
      console.error('Settings update error:', err);
      throw err;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await markNotificationAsRead(notificationId);
      await updateUnreadCount();
      await refreshNotifications();
      
      // Update badge count
      const newUnreadCount = await getUnreadCount();
      await setBadgeCount(newUnreadCount);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      await setBadgeCount(0);
      await refreshNotifications();
    } catch (err) {
      setError('Failed to mark all notifications as read');
      console.error('Mark all as read error:', err);
    }
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(async (): Promise<void> => {
    try {
      const [notificationHistory, count] = await Promise.all([
        getNotificationHistory(50),
        getUnreadCount(),
      ]);
      
      setNotifications(notificationHistory);
      setUnreadCount(count);
      
      // Update badge count
      await setBadgeCount(count);
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  }, []);

  // Update unread count
  const updateUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to update unread count:', err);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup old notifications periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupOldNotifications(30); // Clean up notifications older than 30 days
    }, 24 * 60 * 60 * 1000); // Run daily

    return () => clearInterval(cleanupInterval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(sub => sub.remove());
    };
  }, []);

  // Auto-refresh notifications periodically
  useEffect(() => {
    if (!hasPermission || !userId) return;

    const refreshInterval = setInterval(() => {
      refreshNotifications();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [hasPermission, userId, refreshNotifications]);

  return {
    // Permission state
    hasPermission,
    pushToken,
    isRegistering,
    
    // Notification state
    notificationSettings,
    unreadCount,
    notifications,
    
    // Error state
    error,
    
    // Actions
    requestPermissions,
    getNotificationToken,
    subscribeToNotifications,
    handleIncomingNotification,
    updateNotificationSettings,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    clearError,
  };
};

// Helper hook for notification management in specific contexts
export const useNotificationManager = (userId: string) => {
  const notifications = useNotifications(userId);

  // Setup notification listener on mount
  useEffect(() => {
    if (!notifications.hasPermission) return;

    const unsubscribe = notifications.subscribeToNotifications((notification) => {
      console.log('New notification received:', notification.title);
      
      // Handle specific notification types
      switch (notification.type) {
        case 'friend_request':
          console.log('Friend request notification');
          break;
        case 'post_like':
          console.log('Post liked notification');
          break;
        // Add more specific handling as needed
      }
    });

    return unsubscribe;
  }, [notifications.hasPermission, notifications.subscribeToNotifications]);

  // Request permissions on mount if not already granted
  useEffect(() => {
    if (!notifications.hasPermission && userId) {
      notifications.requestPermissions();
    }
  }, [notifications.hasPermission, userId]);

  return notifications;
};

// Hook for cleanup when user logs out
export const useNotificationCleanup = () => {
  const cleanupNotifications = useCallback(async (userId: string) => {
    try {
      await removePushToken(userId);
      await setBadgeCount(0);
      console.log('Notification cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
    }
  }, []);

  return { cleanupNotifications };
};