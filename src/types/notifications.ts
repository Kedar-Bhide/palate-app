export interface NotificationPayload {
  to: string;
  sound: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  channelId?: string;
}

export interface NotificationSettings {
  friendRequests: boolean;
  friendPosts: boolean;
  likesAndComments: boolean;
  newCuisines: boolean;
  weeklyProgress: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface PushToken {
  token: string;
  userId: string;
  deviceId: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  lastUsed: Date;
}

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_post'
  | 'post_like'
  | 'post_comment'
  | 'achievement_unlocked'
  | 'cuisine_milestone'
  | 'weekly_progress'
  | 'new_cuisine_available'
  | 'reminder'
  | 'system_announcement';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface NotificationResponse {
  notification: {
    request: {
      content: {
        title: string;
        body: string;
        data?: Record<string, any>;
      };
      identifier: string;
    };
  };
  actionIdentifier: string;
  userText?: string;
}

export interface NotificationCallback {
  (notification: NotificationEvent): void;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: 'min' | 'low' | 'default' | 'high' | 'max';
  sound?: boolean;
  vibration?: boolean;
  badge?: boolean;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  deviceId: string;
  appVersion: string;
  osVersion: string;
  pushToken?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  categories: Record<NotificationType, boolean>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  delivery: {
    sound: boolean;
    vibration: boolean;
    badge: boolean;
  };
}

export interface NotificationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface BatchNotificationPayload {
  notifications: NotificationPayload[];
  priority?: 'normal' | 'high';
  ttl?: number;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  variables?: string[];
}

export interface NotificationStats {
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  lastSent?: Date;
}