import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationEvent, NotificationSettings, NotificationType } from '../types/notifications';
import { supabase } from './supabase';

const NOTIFICATIONS_KEY = '@palate_notifications';
const NOTIFICATION_SETTINGS_KEY = '@palate_notification_settings';
const MAX_LOCAL_NOTIFICATIONS = 100;
const CLEANUP_DAYS = 30;

export const storeNotification = async (notification: NotificationEvent): Promise<void> => {
  try {
    // Store locally first
    await storeNotificationLocally(notification);
    
    // Store in database for persistence across devices
    await storeNotificationInDB(notification);
    
    console.log('Notification stored successfully:', notification.id);
  } catch (error) {
    console.error('Failed to store notification:', error);
    // Still try to store locally even if DB fails
    try {
      await storeNotificationLocally(notification);
    } catch (localError) {
      console.error('Failed to store notification locally:', localError);
    }
  }
};

const storeNotificationLocally = async (notification: NotificationEvent): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const notifications: NotificationEvent[] = existingData ? JSON.parse(existingData) : [];
    
    // Add new notification to the beginning
    notifications.unshift({
      ...notification,
      sentAt: notification.sentAt || new Date(),
    });
    
    // Keep only the most recent notifications
    const trimmedNotifications = notifications.slice(0, MAX_LOCAL_NOTIFICATIONS);
    
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmedNotifications));
  } catch (error) {
    throw error;
  }
};

const storeNotificationInDB = async (notification: NotificationEvent): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notification_history')
      .insert({
        id: notification.id,
        type: notification.type,
        user_id: notification.userId,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        scheduled_for: notification.scheduledFor?.toISOString(),
        sent_at: notification.sentAt?.toISOString() || new Date().toISOString(),
        read_at: notification.readAt?.toISOString(),
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const getNotificationHistory = async (limit: number = 50): Promise<NotificationEvent[]> => {
  try {
    // Try to get from database first
    const dbNotifications = await getNotificationHistoryFromDB(limit);
    if (dbNotifications.length > 0) {
      // Sync with local storage
      await syncNotificationsLocally(dbNotifications);
      return dbNotifications;
    }
    
    // Fallback to local storage
    return await getNotificationHistoryLocally(limit);
  } catch (error) {
    console.error('Failed to get notification history:', error);
    // Fallback to local storage
    return await getNotificationHistoryLocally(limit);
  }
};

const getNotificationHistoryFromDB = async (limit: number): Promise<NotificationEvent[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) return [];

    const { data, error } = await supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', user.user.id)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data?.map(item => ({
      id: item.id,
      type: item.type as NotificationType,
      userId: item.user_id,
      title: item.title,
      body: item.body,
      data: item.data,
      scheduledFor: item.scheduled_for ? new Date(item.scheduled_for) : undefined,
      sentAt: item.sent_at ? new Date(item.sent_at) : undefined,
      readAt: item.read_at ? new Date(item.read_at) : undefined,
    })) || [];
  } catch (error) {
    throw error;
  }
};

const getNotificationHistoryLocally = async (limit: number): Promise<NotificationEvent[]> => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) return [];
    
    const notifications: NotificationEvent[] = JSON.parse(data);
    return notifications.slice(0, limit).map(notification => ({
      ...notification,
      sentAt: notification.sentAt ? new Date(notification.sentAt) : undefined,
      readAt: notification.readAt ? new Date(notification.readAt) : undefined,
      scheduledFor: notification.scheduledFor ? new Date(notification.scheduledFor) : undefined,
    }));
  } catch (error) {
    throw error;
  }
};

const syncNotificationsLocally = async (notifications: NotificationEvent[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to sync notifications locally:', error);
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const readAt = new Date();
    
    // Update in database
    await markNotificationAsReadInDB(notificationId, readAt);
    
    // Update locally
    await markNotificationAsReadLocally(notificationId, readAt);
    
    console.log('Notification marked as read:', notificationId);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    // Still try to update locally
    try {
      await markNotificationAsReadLocally(notificationId, new Date());
    } catch (localError) {
      console.error('Failed to mark notification as read locally:', localError);
    }
  }
};

const markNotificationAsReadInDB = async (notificationId: string, readAt: Date): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notification_history')
      .update({ read_at: readAt.toISOString() })
      .eq('id', notificationId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

const markNotificationAsReadLocally = async (notificationId: string, readAt: Date): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) return;
    
    const notifications: NotificationEvent[] = JSON.parse(data);
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, readAt }
        : notification
    );
    
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
  } catch (error) {
    throw error;
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    // Try database first
    const dbCount = await getUnreadCountFromDB();
    if (dbCount >= 0) {
      return dbCount;
    }
    
    // Fallback to local count
    return await getUnreadCountLocally();
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return await getUnreadCountLocally();
  }
};

const getUnreadCountFromDB = async (): Promise<number> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) return 0;

    const { count, error } = await supabase
      .from('notification_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.user.id)
      .is('read_at', null);

    if (error) {
      throw error;
    }

    return count || 0;
  } catch (error) {
    throw error;
  }
};

const getUnreadCountLocally = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) return 0;
    
    const notifications: NotificationEvent[] = JSON.parse(data);
    return notifications.filter(notification => !notification.readAt).length;
  } catch (error) {
    console.error('Failed to get local unread count:', error);
    return 0;
  }
};

export const clearNotificationHistory = async (): Promise<void> => {
  try {
    // Clear from database
    await clearNotificationHistoryFromDB();
    
    // Clear locally
    await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
    
    console.log('Notification history cleared');
  } catch (error) {
    console.error('Failed to clear notification history:', error);
    // Still try to clear locally
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
    } catch (localError) {
      console.error('Failed to clear local notification history:', localError);
    }
  }
};

const clearNotificationHistoryFromDB = async (): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) return;

    const { error } = await supabase
      .from('notification_history')
      .delete()
      .eq('user_id', user.user.id);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const cleanupOldNotifications = async (olderThanDays: number = CLEANUP_DAYS): Promise<void> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // Cleanup from database
    await cleanupOldNotificationsFromDB(cutoffDate);
    
    // Cleanup locally
    await cleanupOldNotificationsLocally(cutoffDate);
    
    console.log(`Cleaned up notifications older than ${olderThanDays} days`);
  } catch (error) {
    console.error('Failed to cleanup old notifications:', error);
  }
};

const cleanupOldNotificationsFromDB = async (cutoffDate: Date): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) return;

    const { error } = await supabase
      .from('notification_history')
      .delete()
      .eq('user_id', user.user.id)
      .lt('sent_at', cutoffDate.toISOString());

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

const cleanupOldNotificationsLocally = async (cutoffDate: Date): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) return;
    
    const notifications: NotificationEvent[] = JSON.parse(data);
    const recentNotifications = notifications.filter(notification => {
      const sentAt = notification.sentAt ? new Date(notification.sentAt) : new Date();
      return sentAt > cutoffDate;
    });
    
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(recentNotifications));
  } catch (error) {
    throw error;
  }
};

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    
    // Return default settings
    return getDefaultNotificationSettings();
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    return getDefaultNotificationSettings();
  }
};

export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    
    // Also save to database for cross-device sync
    await saveNotificationSettingsToDB(settings);
    
    console.log('Notification settings saved');
  } catch (error) {
    console.error('Failed to save notification settings:', error);
    throw error;
  }
};

const saveNotificationSettingsToDB = async (settings: NotificationSettings): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) return;

    const { error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.user.id,
        settings: settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to save notification settings to DB:', error);
  }
};

const getDefaultNotificationSettings = (): NotificationSettings => {
  return {
    friendRequests: true,
    friendPosts: true,
    likesAndComments: true,
    newCuisines: true,
    weeklyProgress: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  };
};

export const getNotificationsByType = async (
  type: NotificationType,
  limit: number = 20
): Promise<NotificationEvent[]> => {
  try {
    const allNotifications = await getNotificationHistory(100);
    return allNotifications
      .filter(notification => notification.type === type)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get notifications by type:', error);
    return [];
  }
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    const unreadNotifications = await getNotificationHistory(100);
    const unread = unreadNotifications.filter(n => !n.readAt);
    
    const promises = unread.map(notification => 
      markNotificationAsRead(notification.id)
    );
    
    await Promise.all(promises);
    console.log('All notifications marked as read');
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
};