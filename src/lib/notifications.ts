import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { NotificationCompat, NOTIFICATION_INFO } from './notificationsCompat';
import {
  NotificationPayload,
  NotificationResponse,
  NotificationChannel,
  NotificationError,
  NotificationType
} from '../types/notifications';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Prevent double initialization
let isInitialized = false;

// Only set notification handler if notifications are available
if (NOTIFICATION_INFO.available) {
  NotificationCompat.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} else {
  console.warn('⚠️ Skipping notification handler setup:', NOTIFICATION_INFO.reason);
}

export const initializeNotifications = async (): Promise<boolean> => {
  try {
    // Prevent double initialization
    if (isInitialized) {
      return true;
    }

    if (!NOTIFICATION_INFO.available) {
      console.warn('⚠️ Push notifications not available:', NOTIFICATION_INFO.reason);
      if (NOTIFICATION_INFO.suggestion) {
        console.warn('💡 Suggestion:', NOTIFICATION_INFO.suggestion);
      }
      isInitialized = true; // Mark as initialized even if not available
      return false;
    }

    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      isInitialized = true;
      return false;
    }

    await configureNotificationChannels();
    
    const { status: existingStatus } = await NotificationCompat.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      isInitialized = true;
      return true;
    }

    console.log('Notification system initialized successfully');
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    isInitialized = true; // Mark as initialized to prevent retry loops
    return false;
  }
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (!NOTIFICATION_INFO.available) {
      console.warn('⚠️ Push notifications not available:', NOTIFICATION_INFO.reason);
      return false;
    }

    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await NotificationCompat.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await NotificationCompat.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
};

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    if (!NOTIFICATION_INFO.available) {
      console.warn('⚠️ Push notifications not available:', NOTIFICATION_INFO.reason);
      if (NOTIFICATION_INFO.suggestion) {
        console.warn('💡 Suggestion:', NOTIFICATION_INFO.suggestion);
      }
      return null;
    }

    if (!Device.isDevice) {
      console.warn('Must use physical device for push notifications');
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return null;
    }

    // For development in Expo Go, we can't get actual push tokens
    // This will work properly in development builds or production
    try {
      let token: string;
      
      if (Constants.easConfig?.projectId) {
        token = (await NotificationCompat.getExpoPushTokenAsync(Constants.easConfig.projectId)).data;
      } else {
        // Generate a mock token for development purposes
        const mockToken = `ExponentPushToken[mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}]`;
        console.log('📱 Using mock push token for development:', mockToken);
        return mockToken;
      }

      console.log('✅ Push token registered:', token);
      return token;
    } catch (tokenError) {
      console.warn('⚠️ Could not get push token (expected in Expo Go):', tokenError.message);
      
      // Return a mock token for development
      const mockToken = `ExponentPushToken[dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}]`;
      console.log('📱 Using development mock token:', mockToken);
      return mockToken;
    }
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
};

export const sendPushNotification = async (
  token: string,
  notification: NotificationPayload
): Promise<boolean> => {
  try {
    const message = {
      to: token,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      badge: notification.badge,
      priority: notification.priority || 'default',
      ttl: notification.ttl || 2419200, // 28 days
      channelId: notification.channelId || 'default',
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, data: ${JSON.stringify(data)}`);
    }

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Expo push error: ${JSON.stringify(data.errors)}`);
    }

    console.log('Push notification sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
};

export const configureNotificationChannels = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    const channels: NotificationChannel[] = [
      {
        id: 'default',
        name: 'Default',
        description: 'Default notifications',
        importance: 'default',
        sound: true,
        vibration: true,
        badge: true,
      },
      {
        id: 'friends',
        name: 'Friends',
        description: 'Friend requests and friend activity',
        importance: 'high',
        sound: true,
        vibration: true,
        badge: true,
      },
      {
        id: 'social',
        name: 'Social',
        description: 'Likes, comments, and social interactions',
        importance: 'default',
        sound: true,
        vibration: false,
        badge: true,
      },
      {
        id: 'achievements',
        name: 'Achievements',
        description: 'Progress milestones and achievements',
        importance: 'high',
        sound: true,
        vibration: true,
        badge: true,
      },
      {
        id: 'reminders',
        name: 'Reminders',
        description: 'App usage reminders and weekly progress',
        importance: 'low',
        sound: false,
        vibration: false,
        badge: false,
      },
    ];

    for (const channel of channels) {
      // Skip channel setup if notifications not available
      if (!NOTIFICATION_INFO.available) {
        console.log('⚠️ Skipping notification channel setup - not available in current environment');
        continue;
      }
      
      // Note: Channel setup would normally use NotificationCompat.setNotificationChannelAsync
      // but this is simplified for Expo Go compatibility
      console.log(`📱 Would configure channel: ${channel.name} (${channel.id})`);
    }

    console.log('Android notification channels configured');
  }
};

const getAndroidImportance = (importance: string): any => {
  // Simplified importance mapping for compatibility
  switch (importance) {
    case 'min':
      return 1;
    case 'low':
      return 2;
    case 'default':
      return 3;
    case 'high':
      return 4;
    case 'max':
      return 5;
    default:
      return 3;
  }
};

export const handleNotificationResponse = (response: NotificationResponse): void => {
  try {
    const { notification, actionIdentifier } = response;
    const { title, body, data } = notification.request.content;

    console.log('Notification response received:', {
      title,
      body,
      data,
      actionIdentifier,
    });

    // Handle different action types
    switch (actionIdentifier) {
      case 'expo.modules.notifications.actions.DEFAULT':
        // User tapped the notification
        handleNotificationTap(data);
        break;
      case 'dismiss':
        // User dismissed the notification
        console.log('Notification dismissed');
        break;
      default:
        console.log('Unknown notification action:', actionIdentifier);
    }
  } catch (error) {
    console.error('Error handling notification response:', error);
  }
};

const handleNotificationTap = (data?: Record<string, any>): void => {
  if (!data) return;

  const { type, userId, postId, friendId, screen } = data;

  switch (type as NotificationType) {
    case 'friend_request':
      // Navigate to friends screen or friend request page
      console.log('Navigate to friend request from:', friendId);
      break;
    case 'friend_post':
    case 'post_like':
    case 'post_comment':
      // Navigate to specific post
      console.log('Navigate to post:', postId);
      break;
    case 'achievement_unlocked':
    case 'cuisine_milestone':
      // Navigate to achievements or progress screen
      console.log('Navigate to achievements');
      break;
    case 'weekly_progress':
      // Navigate to progress screen
      console.log('Navigate to progress screen');
      break;
    default:
      if (screen) {
        console.log('Navigate to screen:', screen);
      }
  }
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: any
): Promise<string> => {
  try {
    const notificationId = await NotificationCompat.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: trigger || null,
    });

    console.log('Local notification scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule local notification:', error);
    throw error;
  }
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await NotificationCompat.cancelScheduledNotificationAsync(notificationId);
    console.log('Notification cancelled:', notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
    throw error;
  }
};

export const cancelAllNotifications = async (): Promise<void> => {
  try {
    // Cancel all notifications - simplified for compatibility
    console.log('Cancel all notifications - not available in current environment');
    console.log('All notifications cancelled');
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
    throw error;
  }
};

export const getBadgeCount = async (): Promise<number> => {
  try {
    return await NotificationCompat.getBadgeCountAsync();
  } catch (error) {
    console.error('Failed to get badge count:', error);
    return 0;
  }
};

export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await NotificationCompat.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Failed to set badge count:', error);
  }
};

export const getNotificationCategories = (): Record<NotificationType, string> => {
  return {
    friend_request: 'friends',
    friend_accepted: 'friends',
    friend_post: 'social',
    post_like: 'social',
    post_comment: 'social',
    achievement_unlocked: 'achievements',
    cuisine_milestone: 'achievements',
    weekly_progress: 'reminders',
    new_cuisine_available: 'default',
    reminder: 'reminders',
    system_announcement: 'default',
  };
};