/**
 * Notification Compatibility Layer
 * Handles the differences between Expo Go and development builds
 * for push notifications functionality
 */

import Constants from 'expo-constants';

// Check if we're running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
const isSDK53OrHigher = parseInt(Constants.expoVersion?.split('.')[0] || '0') >= 53;
const pushNotificationsUnavailable = isExpoGo && isSDK53OrHigher;

// Safe notification imports
let Notifications: any = null;
let notificationError: string | null = null;

try {
  if (!pushNotificationsUnavailable) {
    Notifications = require('expo-notifications');
  } else {
    notificationError = 'Push notifications are not available in Expo Go with SDK 53+. Use a development build.';
  }
} catch (error) {
  notificationError = 'Failed to load expo-notifications';
  console.warn('Failed to load expo-notifications:', error);
}

export const NotificationCompat = {
  // Check if notifications are available
  isAvailable: () => !pushNotificationsUnavailable && Notifications !== null,
  
  // Get availability info
  getAvailabilityInfo: () => ({
    available: !pushNotificationsUnavailable && Notifications !== null,
    reason: notificationError,
    isExpoGo,
    sdkVersion: Constants.expoVersion,
    suggestion: pushNotificationsUnavailable 
      ? 'Create a development build to use push notifications'
      : null
  }),

  // Safe wrapper for notification methods
  async getPermissionsAsync() {
    if (!this.isAvailable()) {
      return { status: 'undetermined', granted: false };
    }
    return await Notifications.getPermissionsAsync();
  },

  async requestPermissionsAsync(permissions?: any) {
    if (!this.isAvailable()) {
      return { status: 'denied', granted: false };
    }
    return await Notifications.requestPermissionsAsync(permissions);
  },

  async getExpoPushTokenAsync(projectId?: string) {
    if (!this.isAvailable()) {
      throw new Error(notificationError || 'Notifications not available');
    }
    const config: any = { projectId };
    if (projectId) {
      config.projectId = projectId;
    } else if (Constants.expoConfig?.extra?.eas?.projectId) {
      config.projectId = Constants.expoConfig.extra.eas.projectId;
    }
    return await Notifications.getExpoPushTokenAsync(config);
  },

  setNotificationHandler(handler: any) {
    if (!this.isAvailable()) {
      console.warn('Cannot set notification handler: notifications not available');
      return;
    }
    return Notifications.setNotificationHandler(handler);
  },

  addNotificationReceivedListener(listener: any) {
    if (!this.isAvailable()) {
      console.warn('Cannot add notification listener: notifications not available');
      return { remove: () => {} };
    }
    return Notifications.addNotificationReceivedListener(listener);
  },

  addNotificationResponseReceivedListener(listener: any) {
    if (!this.isAvailable()) {
      console.warn('Cannot add response listener: notifications not available');
      return { remove: () => {} };
    }
    return Notifications.addNotificationResponseReceivedListener(listener);
  },

  async setBadgeCountAsync(badgeCount: number) {
    if (!this.isAvailable()) {
      return false;
    }
    return await Notifications.setBadgeCountAsync(badgeCount);
  },

  async getBadgeCountAsync() {
    if (!this.isAvailable()) {
      return 0;
    }
    return await Notifications.getBadgeCountAsync();
  },

  async scheduleNotificationAsync(request: any) {
    if (!this.isAvailable()) {
      throw new Error(notificationError || 'Notifications not available');
    }
    return await Notifications.scheduleNotificationAsync(request);
  },

  async cancelScheduledNotificationAsync(id: string) {
    if (!this.isAvailable()) {
      return;
    }
    return await Notifications.cancelScheduledNotificationAsync(id);
  },

  async dismissNotificationAsync(id: string) {
    if (!this.isAvailable()) {
      return;
    }
    return await Notifications.dismissNotificationAsync(id);
  }
};

// Export notification availability info for components to use
export const NOTIFICATION_INFO = NotificationCompat.getAvailabilityInfo();

// Log availability status
if (__DEV__) {
  if (NOTIFICATION_INFO.available) {
    console.log('📱 Push notifications are available');
  } else {
    console.warn('⚠️ Push notifications unavailable:', NOTIFICATION_INFO.reason);
    if (NOTIFICATION_INFO.suggestion) {
      console.warn('💡 Suggestion:', NOTIFICATION_INFO.suggestion);
    }
  }
}

export default NotificationCompat;