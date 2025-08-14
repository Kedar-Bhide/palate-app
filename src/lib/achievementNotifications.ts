/**
 * Achievement Notifications System
 * Handles push notifications and local notifications for achievements and milestones
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Achievement, UserCuisineProgress, Cuisine } from '../types/cuisine';

// Storage keys
const NOTIFICATION_TOKEN_KEY = '@notifications/push_token';
const NOTIFICATION_SETTINGS_KEY = '@notifications/settings';
const SCHEDULED_NOTIFICATIONS_KEY = '@notifications/scheduled';

export interface NotificationSettings {
  achievementUnlocks: boolean;
  weeklyProgress: boolean;
  goalReminders: boolean;
  streakReminders: boolean;
  suggestions: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface ScheduledNotification {
  id: string;
  type: 'achievement' | 'goal_reminder' | 'streak_reminder' | 'weekly_progress' | 'suggestion';
  title: string;
  body: string;
  data?: any;
  scheduledTime: Date;
  isRecurring: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  achievementUnlocks: true,
  weeklyProgress: true,
  goalReminders: true,
  streakReminders: true,
  suggestions: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class AchievementNotificationService {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private pushToken: string | null = null;
  private scheduledNotifications: ScheduledNotification[] = [];

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    try {
      // Load settings
      await this.loadSettings();
      
      // Request permissions and register for push notifications
      await this.registerForPushNotifications();
      
      // Load scheduled notifications
      await this.loadScheduledNotifications();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      console.log('Achievement notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<void> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'default-project-id',
      });
      
      this.pushToken = token.data;
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token.data);
      console.log('Push token:', token.data);
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('achievements', {
        name: 'Achievement Notifications',
        description: 'Notifications for unlocked achievements and milestones',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Goal & Streak Reminders',
        description: 'Reminders for goals and streak maintenance',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle user tapping on notification
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const { data } = notification.request.content;
    
    if (data?.type === 'achievement_unlock') {
      // Could trigger in-app celebration animation
      console.log('Achievement unlock notification received');
    }
  }

  /**
   * Handle user tapping on notification
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { data } = response.notification.request.content;
    
    // Navigate to relevant screen based on notification type
    switch (data?.type) {
      case 'achievement_unlock':
        // Navigate to achievements screen
        console.log('Navigate to achievements');
        break;
      case 'goal_reminder':
        // Navigate to goals screen
        console.log('Navigate to goals');
        break;
      case 'streak_reminder':
        // Navigate to progress screen
        console.log('Navigate to progress');
        break;
    }
  }

  /**
   * Send achievement unlock notification
   */
  async notifyAchievementUnlock(achievement: Achievement): Promise<void> {
    if (!this.settings.achievementUnlocks) return;

    const notificationContent = {
      title: '🎉 Achievement Unlocked!',
      body: `${achievement.name}: ${achievement.description}`,
      data: {
        type: 'achievement_unlock',
        achievementId: achievement.id,
        points: achievement.points,
      },
      sound: this.settings.soundEnabled ? 'default' : undefined,
      vibrate: this.settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      priority: Notifications.AndroidImportance.HIGH,
      categoryIdentifier: 'achievements',
    };

    try {
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });
      
      console.log('Achievement unlock notification sent:', achievement.name);
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  /**
   * Send milestone celebration notification
   */
  async notifyMilestoneReached(
    milestone: number, 
    totalCuisines: number, 
    nextMilestone?: number
  ): Promise<void> {
    if (!this.settings.achievementUnlocks) return;

    const title = milestone === 1 
      ? '🎊 First Cuisine Tried!'
      : `🌟 ${milestone} Cuisines Explored!`;
    
    const body = nextMilestone 
      ? `Amazing progress! Only ${nextMilestone - milestone} more to reach ${nextMilestone} cuisines.`
      : `You've tried ${milestone} out of ${totalCuisines} cuisines. Keep exploring!`;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'milestone_reached',
            milestone,
            totalCuisines,
            nextMilestone,
          },
          sound: this.settings.soundEnabled ? 'default' : undefined,
          vibrate: this.settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
          priority: Notifications.AndroidImportance.HIGH,
          categoryIdentifier: 'achievements',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending milestone notification:', error);
    }
  }

  /**
   * Schedule goal reminder notification
   */
  async scheduleGoalReminder(
    goalId: string,
    goalTitle: string,
    daysUntilDeadline: number
  ): Promise<void> {
    if (!this.settings.goalReminders || daysUntilDeadline <= 0) return;

    const reminderDays = [7, 3, 1]; // Remind at 7, 3, and 1 day before deadline
    
    for (const daysBefore of reminderDays) {
      if (daysUntilDeadline > daysBefore) {
        const scheduledTime = new Date();
        scheduledTime.setDate(scheduledTime.getDate() + (daysUntilDeadline - daysBefore));
        scheduledTime.setHours(19, 0, 0, 0); // 7 PM local time

        const notificationId = `goal_reminder_${goalId}_${daysBefore}`;
        
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🎯 Goal Reminder',
              body: `${daysBefore} day${daysBefore > 1 ? 's' : ''} left to complete "${goalTitle}"`,
              data: {
                type: 'goal_reminder',
                goalId,
                daysBefore,
              },
              sound: this.settings.soundEnabled ? 'default' : undefined,
              categoryIdentifier: 'reminders',
            },
            trigger: { date: scheduledTime },
            identifier: notificationId,
          });

          // Save to scheduled notifications
          this.scheduledNotifications.push({
            id: notificationId,
            type: 'goal_reminder',
            title: '🎯 Goal Reminder',
            body: `${daysBefore} day${daysBefore > 1 ? 's' : ''} left to complete "${goalTitle}"`,
            data: { goalId, daysBefore },
            scheduledTime,
            isRecurring: false,
          });
        } catch (error) {
          console.error('Error scheduling goal reminder:', error);
        }
      }
    }

    await this.saveScheduledNotifications();
  }

  /**
   * Schedule streak reminder notification
   */
  async scheduleStreakReminder(): Promise<void> {
    if (!this.settings.streakReminders) return;

    // Cancel existing streak reminders
    await this.cancelNotificationsByType('streak_reminder');

    // Schedule daily reminder at 6 PM
    const scheduledTime = new Date();
    scheduledTime.setHours(18, 0, 0, 0);
    
    if (scheduledTime <= new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const notificationId = 'daily_streak_reminder';

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Keep Your Streak Alive!',
          body: "Don't let your cuisine exploration streak break. Try something new today!",
          data: {
            type: 'streak_reminder',
          },
          sound: this.settings.soundEnabled ? 'default' : undefined,
          categoryIdentifier: 'reminders',
        },
        trigger: {
          hour: 18,
          minute: 0,
          repeats: true,
        },
        identifier: notificationId,
      });

      this.scheduledNotifications.push({
        id: notificationId,
        type: 'streak_reminder',
        title: '🔥 Keep Your Streak Alive!',
        body: "Don't let your cuisine exploration streak break. Try something new today!",
        scheduledTime,
        isRecurring: true,
      });

      await this.saveScheduledNotifications();
    } catch (error) {
      console.error('Error scheduling streak reminder:', error);
    }
  }

  /**
   * Send weekly progress summary
   */
  async sendWeeklyProgressSummary(
    weeklyProgress: {
      cuisinesTried: number;
      achievementsUnlocked: number;
      diversityScore: number;
      streak: number;
    }
  ): Promise<void> {
    if (!this.settings.weeklyProgress) return;

    const title = '📊 Weekly Progress Report';
    const body = weeklyProgress.cuisinesTried > 0 
      ? `This week: ${weeklyProgress.cuisinesTried} cuisines, ${weeklyProgress.achievementsUnlocked} achievements! 🎉`
      : "Time to explore! Try a new cuisine this week to keep your journey going.";

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'weekly_progress',
            ...weeklyProgress,
          },
          sound: this.settings.soundEnabled ? 'default' : undefined,
          categoryIdentifier: 'reminders',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending weekly progress notification:', error);
    }
  }

  /**
   * Send cuisine suggestion notification
   */
  async sendCuisineSuggestion(suggestion: {
    cuisine: Cuisine;
    reason: string;
    confidence: number;
  }): Promise<void> {
    if (!this.settings.suggestions) return;

    const title = '💡 New Cuisine Suggestion';
    const body = `Try ${suggestion.cuisine.name} cuisine! ${suggestion.reason}`;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'cuisine_suggestion',
            cuisineId: suggestion.cuisine.id,
            reason: suggestion.reason,
            confidence: suggestion.confidence,
          },
          sound: this.settings.soundEnabled ? 'default' : undefined,
          categoryIdentifier: 'reminders',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending cuisine suggestion notification:', error);
    }
  }

  /**
   * Update notification settings
   */
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
    
    // If streak reminders were disabled, cancel them
    if (newSettings.streakReminders === false) {
      await this.cancelNotificationsByType('streak_reminder');
    }
    
    console.log('Notification settings updated:', this.settings);
  }

  /**
   * Get current notification settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Cancel all scheduled notifications of a specific type
   */
  private async cancelNotificationsByType(type: string): Promise<void> {
    const notificationsToCancel = this.scheduledNotifications
      .filter(notification => notification.type === type)
      .map(notification => notification.id);

    for (const notificationId of notificationsToCancel) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }

    this.scheduledNotifications = this.scheduledNotifications
      .filter(notification => notification.type !== type);
    
    await this.saveScheduledNotifications();
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.scheduledNotifications = [];
    await this.saveScheduledNotifications();
    console.log('All notifications cancelled');
  }

  /**
   * Get scheduled notifications
   */
  getScheduledNotifications(): ScheduledNotification[] {
    return [...this.scheduledNotifications];
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  /**
   * Load scheduled notifications from storage
   */
  private async loadScheduledNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (stored) {
        this.scheduledNotifications = JSON.parse(stored).map((notification: any) => ({
          ...notification,
          scheduledTime: new Date(notification.scheduledTime),
        }));
      }
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  }

  /**
   * Save scheduled notifications to storage
   */
  private async saveScheduledNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        SCHEDULED_NOTIFICATIONS_KEY, 
        JSON.stringify(this.scheduledNotifications)
      );
    } catch (error) {
      console.error('Error saving scheduled notifications:', error);
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<void> {
    const now = new Date();
    const activeNotifications = this.scheduledNotifications.filter(
      notification => notification.isRecurring || notification.scheduledTime > now
    );

    if (activeNotifications.length !== this.scheduledNotifications.length) {
      this.scheduledNotifications = activeNotifications;
      await this.saveScheduledNotifications();
      console.log('Cleaned up expired notifications');
    }
  }
}

// Export singleton instance
export const achievementNotificationService = new AchievementNotificationService();

// Helper functions for common notification scenarios
export const notificationHelpers = {
  /**
   * Handle achievement unlock with appropriate notifications
   */
  async handleAchievementUnlock(achievement: Achievement): Promise<void> {
    await achievementNotificationService.notifyAchievementUnlock(achievement);
    
    // If it's a milestone achievement, also send milestone notification
    if (achievement.type === 'cuisine_count' && achievement.threshold) {
      // This would need to be called with proper context
      // await achievementNotificationService.notifyMilestoneReached(achievement.threshold, totalCuisines);
    }
  },

  /**
   * Setup all recurring notifications
   */
  async setupRecurringNotifications(): Promise<void> {
    await achievementNotificationService.scheduleStreakReminder();
    
    // Weekly progress summary every Sunday at 7 PM
    const sundayReminder = new Date();
    sundayReminder.setHours(19, 0, 0, 0);
    const daysUntilSunday = (7 - sundayReminder.getDay()) % 7;
    sundayReminder.setDate(sundayReminder.getDate() + daysUntilSunday);

    // This would be handled by a background task or server-side
    console.log('Recurring notifications setup completed');
  },

  /**
   * Send motivational notification based on user activity
   */
  async sendMotivationalNotification(daysSinceLastActivity: number): Promise<void> {
    if (daysSinceLastActivity < 3) return; // Don't spam active users

    const messages = [
      "Your taste buds are calling! Discover a new cuisine today 🍜",
      "The world of flavors awaits you! Try something new 🌍",
      "Your culinary adventure is on pause. Ready to continue? 🚀",
      "Missing the excitement of new tastes? Let's explore! ✨",
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '👋 We miss you!',
          body: randomMessage,
          data: {
            type: 'motivational',
            daysSinceLastActivity,
          },
          categoryIdentifier: 'reminders',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending motivational notification:', error);
    }
  },
};

// Initialize the service
achievementNotificationService.initialize();