import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { NotificationEvent, NotificationSettings, NotificationType } from '../types/notifications';

export interface UserBehaviorData {
  activeHours: number[]; // Hours when user is most active (0-23)
  preferredDays: number[]; // Days of week when user is most active (0-6, 0=Sunday)
  avgResponseTime: number; // Average time to read notifications (minutes)
  engagementRate: number; // Percentage of notifications interacted with
  quietHours: { start: number; end: number }; // User's quiet hours
  deviceUsagePattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'mixed';
  notificationFrequencyPreference: 'low' | 'medium' | 'high';
  lastActiveTime: Date;
  timeZone: string;
}

export interface NotificationPersonalization {
  userId: string;
  preferredTypes: NotificationType[];
  mutedTypes: NotificationType[];
  customFrequency: Record<NotificationType, number>; // Max per day for each type
  contentPreferences: {
    showImages: boolean;
    showPreviews: boolean;
    useEmojis: boolean;
    shortMessages: boolean;
  };
  deliveryPreferences: {
    batchSimilar: boolean;
    delayNonUrgent: boolean;
    respectQuietHours: boolean;
    adaptToActivity: boolean;
  };
}

export interface OptimalTiming {
  recommendedTime: Date;
  confidence: number; // 0-1, how confident we are in this timing
  reason: string;
  alternativeTimes: Date[];
}

export interface PersonalizationInsights {
  userId: string;
  bestEngagementTime: string;
  preferredNotificationTypes: NotificationType[];
  lowEngagementTypes: NotificationType[];
  optimalFrequency: Record<NotificationType, number>;
  behaviorPattern: string;
  recommendations: string[];
}

const USER_BEHAVIOR_KEY = 'user_behavior_data';
const PERSONALIZATION_KEY = 'notification_personalization';
const INSIGHTS_KEY = 'personalization_insights';

export class SmartNotificationEngine {
  private static instance: SmartNotificationEngine;
  private behaviorData: Map<string, UserBehaviorData> = new Map();
  private personalizations: Map<string, NotificationPersonalization> = new Map();

  static getInstance(): SmartNotificationEngine {
    if (!SmartNotificationEngine.instance) {
      SmartNotificationEngine.instance = new SmartNotificationEngine();
    }
    return SmartNotificationEngine.instance;
  }

  /**
   * Analyze user behavior patterns from notification history
   */
  async analyzeUserBehavior(userId: string): Promise<UserBehaviorData> {
    try {
      // Get notification history from database
      const { data: notifications, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        return this.getDefaultBehaviorData(userId);
      }

      // Analyze interaction patterns
      const readNotifications = notifications.filter(n => n.read_at);
      const interactedNotifications = notifications.filter(n => n.clicked_at || n.action_taken);

      // Calculate active hours
      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      
      readNotifications.forEach(notification => {
        if (notification.read_at) {
          const readTime = new Date(notification.read_at);
          hourCounts[readTime.getHours()]++;
          dayCounts[readTime.getDay()]++;
        }
      });

      const activeHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(item => item.hour);

      const preferredDays = dayCounts
        .map((count, day) => ({ day, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map(item => item.day);

      // Calculate average response time
      const responseTimes = readNotifications
        .filter(n => n.sent_at && n.read_at)
        .map(n => {
          const sent = new Date(n.sent_at);
          const read = new Date(n.read_at);
          return (read.getTime() - sent.getTime()) / (1000 * 60); // minutes
        });

      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 60; // Default 1 hour

      // Calculate engagement rate
      const engagementRate = notifications.length > 0 
        ? interactedNotifications.length / notifications.length
        : 0.5;

      // Determine usage pattern
      const morningActivity = hourCounts.slice(6, 12).reduce((sum, count) => sum + count, 0);
      const afternoonActivity = hourCounts.slice(12, 17).reduce((sum, count) => sum + count, 0);
      const eveningActivity = hourCounts.slice(17, 22).reduce((sum, count) => sum + count, 0);
      const nightActivity = hourCounts.slice(22, 24).concat(hourCounts.slice(0, 6)).reduce((sum, count) => sum + count, 0);

      const maxActivity = Math.max(morningActivity, afternoonActivity, eveningActivity, nightActivity);
      let deviceUsagePattern: UserBehaviorData['deviceUsagePattern'] = 'mixed';
      
      if (maxActivity === morningActivity) deviceUsagePattern = 'morning';
      else if (maxActivity === afternoonActivity) deviceUsagePattern = 'afternoon';
      else if (maxActivity === eveningActivity) deviceUsagePattern = 'evening';
      else if (maxActivity === nightActivity) deviceUsagePattern = 'night';

      // Determine quiet hours (least active 8-hour period)
      let minActivitySum = Infinity;
      let quietStart = 22;
      
      for (let start = 0; start < 24; start++) {
        let sum = 0;
        for (let i = 0; i < 8; i++) {
          sum += hourCounts[(start + i) % 24];
        }
        if (sum < minActivitySum) {
          minActivitySum = sum;
          quietStart = start;
        }
      }

      const behaviorData: UserBehaviorData = {
        activeHours,
        preferredDays,
        avgResponseTime,
        engagementRate,
        quietHours: { 
          start: quietStart, 
          end: (quietStart + 8) % 24 
        },
        deviceUsagePattern,
        notificationFrequencyPreference: engagementRate > 0.7 ? 'high' : engagementRate > 0.4 ? 'medium' : 'low',
        lastActiveTime: new Date(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Cache the behavior data
      this.behaviorData.set(userId, behaviorData);
      await this.saveBehaviorData(userId, behaviorData);

      return behaviorData;

    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      return this.getDefaultBehaviorData(userId);
    }
  }

  /**
   * Get optimal notification delivery time
   */
  async getOptimalNotificationTime(
    userId: string, 
    notificationType: NotificationType,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<OptimalTiming> {
    try {
      const behaviorData = await this.getBehaviorData(userId);
      const personalization = await this.getPersonalization(userId);
      const now = new Date();

      // For urgent notifications, send immediately unless in quiet hours
      if (urgency === 'high') {
        const isQuietTime = this.isInQuietHours(now, behaviorData.quietHours);
        if (!isQuietTime) {
          return {
            recommendedTime: now,
            confidence: 0.9,
            reason: 'High urgency notification sent immediately',
            alternativeTimes: [],
          };
        }
      }

      // Check if user respects quiet hours
      if (personalization.deliveryPreferences.respectQuietHours) {
        const isQuietTime = this.isInQuietHours(now, behaviorData.quietHours);
        if (isQuietTime) {
          const nextActiveTime = this.getNextActiveTime(behaviorData);
          return {
            recommendedTime: nextActiveTime,
            confidence: 0.8,
            reason: 'Delayed until user active hours',
            alternativeTimes: [now],
          };
        }
      }

      // Find optimal time based on user's active hours
      const currentHour = now.getHours();
      const todayActiveHours = behaviorData.activeHours
        .filter(hour => hour > currentHour)
        .sort((a, b) => a - b);

      let recommendedTime: Date;
      let confidence = 0.7;
      let reason = 'Based on your activity pattern';

      if (todayActiveHours.length > 0) {
        // Find next active hour today
        const nextActiveHour = todayActiveHours[0];
        recommendedTime = new Date(now);
        recommendedTime.setHours(nextActiveHour, 0, 0, 0);
        
        // Add some randomization to avoid notification storms
        const randomOffset = Math.floor(Math.random() * 30); // 0-30 minutes
        recommendedTime.setMinutes(randomOffset);
        
        confidence = 0.8;
        reason = `Scheduled for your most active time (${nextActiveHour}:${randomOffset.toString().padStart(2, '0')})`;
      } else {
        // No more active hours today, schedule for tomorrow's first active hour
        const tomorrowActiveHour = behaviorData.activeHours[0] || 9;
        recommendedTime = new Date(now);
        recommendedTime.setDate(recommendedTime.getDate() + 1);
        recommendedTime.setHours(tomorrowActiveHour, 0, 0, 0);
        
        confidence = 0.6;
        reason = 'Scheduled for tomorrow\'s active hours';
      }

      // Generate alternative times
      const alternativeTimes = behaviorData.activeHours
        .filter(hour => hour !== recommendedTime.getHours())
        .slice(0, 3)
        .map(hour => {
          const altTime = new Date(recommendedTime);
          altTime.setHours(hour);
          return altTime;
        });

      return {
        recommendedTime,
        confidence,
        reason,
        alternativeTimes,
      };

    } catch (error) {
      console.error('Error getting optimal timing:', error);
      return {
        recommendedTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        confidence: 0.3,
        reason: 'Default timing due to analysis error',
        alternativeTimes: [],
      };
    }
  }

  /**
   * Personalize notification content
   */
  async personalizeNotificationContent(
    userId: string,
    notification: NotificationEvent
  ): Promise<NotificationEvent> {
    try {
      const personalization = await this.getPersonalization(userId);
      const behaviorData = await this.getBehaviorData(userId);

      let personalizedNotification = { ...notification };

      // Adjust content based on preferences
      if (personalization.contentPreferences.shortMessages && notification.body.length > 100) {
        personalizedNotification.body = notification.body.substring(0, 97) + '...';
      }

      // Add emojis if user prefers them
      if (personalization.contentPreferences.useEmojis) {
        personalizedNotification = this.addEmojiToNotification(personalizedNotification);
      }

      // Adjust notification style based on engagement patterns
      if (behaviorData.engagementRate < 0.3) {
        // Low engagement - make notifications more attention-grabbing
        personalizedNotification.title = `🔔 ${personalizedNotification.title}`;
        personalizedNotification.data = {
          ...personalizedNotification.data,
          priority: 'high',
          sound: 'default',
        };
      }

      // Add personalized greeting based on time
      const hour = new Date().getHours();
      let greeting = '';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      else greeting = 'Good evening';

      if (notification.type === 'system_announcement' || notification.type === 'weekly_progress') {
        personalizedNotification.body = `${greeting}! ${personalizedNotification.body}`;
      }

      return personalizedNotification;

    } catch (error) {
      console.error('Error personalizing notification:', error);
      return notification;
    }
  }

  /**
   * Determine if notification should be sent now
   */
  async shouldSendNotificationNow(
    userId: string,
    notificationType: NotificationType,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{ shouldSend: boolean; reason: string; suggestedDelay?: number }> {
    try {
      const behaviorData = await this.getBehaviorData(userId);
      const personalization = await this.getPersonalization(userId);
      const now = new Date();

      // Always send high urgency notifications (except deep quiet hours)
      if (urgency === 'high') {
        const hour = now.getHours();
        if (hour >= 1 && hour <= 5) { // Deep sleep hours
          return {
            shouldSend: false,
            reason: 'Even urgent notifications delayed during deep sleep hours',
            suggestedDelay: (6 - hour) * 60, // Delay until 6 AM
          };
        }
        return { shouldSend: true, reason: 'High urgency notification' };
      }

      // Check quiet hours
      if (personalization.deliveryPreferences.respectQuietHours) {
        const isQuietTime = this.isInQuietHours(now, behaviorData.quietHours);
        if (isQuietTime) {
          const nextActiveTime = this.getNextActiveTime(behaviorData);
          const delayMinutes = Math.floor((nextActiveTime.getTime() - now.getTime()) / (1000 * 60));
          return {
            shouldSend: false,
            reason: 'User in quiet hours',
            suggestedDelay: delayMinutes,
          };
        }
      }

      // Check if user is likely to be active
      const currentHour = now.getHours();
      const isActiveHour = behaviorData.activeHours.includes(currentHour);
      
      if (!isActiveHour && urgency === 'low') {
        return {
          shouldSend: false,
          reason: 'User typically not active at this time',
          suggestedDelay: 60, // Try again in 1 hour
        };
      }

      // Check notification frequency limits
      const recentNotifications = await this.getRecentNotificationCount(userId, notificationType);
      const maxPerDay = personalization.customFrequency[notificationType] || this.getDefaultFrequencyLimit(notificationType);
      
      if (recentNotifications >= maxPerDay) {
        return {
          shouldSend: false,
          reason: 'Daily frequency limit reached',
          suggestedDelay: 24 * 60, // Delay until tomorrow
        };
      }

      // All checks passed
      return { shouldSend: true, reason: 'Optimal time for notification' };

    } catch (error) {
      console.error('Error checking if should send notification:', error);
      return { shouldSend: true, reason: 'Default send due to error' };
    }
  }

  /**
   * Generate personalization insights
   */
  async generatePersonalizationInsights(userId: string): Promise<PersonalizationInsights> {
    try {
      const behaviorData = await this.getBehaviorData(userId);
      const personalization = await this.getPersonalization(userId);

      // Get notification type performance
      const { data: notifications, error } = await supabase
        .from('notification_history')
        .select('type, read_at, clicked_at, action_taken')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const typePerformance: Record<string, { sent: number; engaged: number; rate: number }> = {};
      
      (notifications || []).forEach(notification => {
        const type = notification.type;
        if (!typePerformance[type]) {
          typePerformance[type] = { sent: 0, engaged: 0, rate: 0 };
        }
        typePerformance[type].sent++;
        if (notification.clicked_at || notification.action_taken) {
          typePerformance[type].engaged++;
        }
      });

      Object.keys(typePerformance).forEach(type => {
        const perf = typePerformance[type];
        perf.rate = perf.sent > 0 ? perf.engaged / perf.sent : 0;
      });

      // Determine best engagement time
      const bestHour = behaviorData.activeHours[0] || 9;
      const bestEngagementTime = `${bestHour}:00 ${bestHour < 12 ? 'AM' : 'PM'}`;

      // Get preferred and low engagement types
      const sortedTypes = Object.entries(typePerformance)
        .sort(([, a], [, b]) => b.rate - a.rate);

      const preferredTypes = sortedTypes.slice(0, 3).map(([type]) => type as NotificationType);
      const lowEngagementTypes = sortedTypes.slice(-2).map(([type]) => type as NotificationType);

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (behaviorData.engagementRate < 0.3) {
        recommendations.push('Consider reducing notification frequency to improve engagement');
      }
      
      if (behaviorData.avgResponseTime > 4 * 60) { // More than 4 hours
        recommendations.push('Your notifications might be better timed - try adjusting delivery hours');
      }
      
      if (lowEngagementTypes.length > 0) {
        recommendations.push(`Consider muting ${lowEngagementTypes[0]} notifications to reduce noise`);
      }

      const behaviorPatternMap = {
        morning: 'You\'re most active in the morning hours',
        afternoon: 'You prefer afternoon notifications',
        evening: 'You\'re most engaged during evening hours',
        night: 'You\'re a night owl - active during late hours',
        mixed: 'You have varied activity patterns throughout the day',
      };

      const insights: PersonalizationInsights = {
        userId,
        bestEngagementTime,
        preferredNotificationTypes: preferredTypes,
        lowEngagementTypes,
        optimalFrequency: personalization.customFrequency,
        behaviorPattern: behaviorPatternMap[behaviorData.deviceUsagePattern],
        recommendations,
      };

      // Cache insights
      await AsyncStorage.setItem(`${INSIGHTS_KEY}_${userId}`, JSON.stringify(insights));

      return insights;

    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  // Helper methods
  private getDefaultBehaviorData(userId: string): UserBehaviorData {
    return {
      activeHours: [9, 12, 15, 18, 20], // Default active hours
      preferredDays: [1, 2, 3, 4, 5], // Weekdays
      avgResponseTime: 60, // 1 hour
      engagementRate: 0.5,
      quietHours: { start: 22, end: 6 },
      deviceUsagePattern: 'mixed',
      notificationFrequencyPreference: 'medium',
      lastActiveTime: new Date(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private async getBehaviorData(userId: string): Promise<UserBehaviorData> {
    if (this.behaviorData.has(userId)) {
      return this.behaviorData.get(userId)!;
    }

    try {
      const saved = await AsyncStorage.getItem(`${USER_BEHAVIOR_KEY}_${userId}`);
      if (saved) {
        const data = JSON.parse(saved) as UserBehaviorData;
        this.behaviorData.set(userId, data);
        return data;
      }
    } catch (error) {
      console.error('Error loading behavior data:', error);
    }

    return this.getDefaultBehaviorData(userId);
  }

  private async getPersonalization(userId: string): Promise<NotificationPersonalization> {
    if (this.personalizations.has(userId)) {
      return this.personalizations.get(userId)!;
    }

    try {
      const saved = await AsyncStorage.getItem(`${PERSONALIZATION_KEY}_${userId}`);
      if (saved) {
        const data = JSON.parse(saved) as NotificationPersonalization;
        this.personalizations.set(userId, data);
        return data;
      }
    } catch (error) {
      console.error('Error loading personalization:', error);
    }

    return this.getDefaultPersonalization(userId);
  }

  private getDefaultPersonalization(userId: string): NotificationPersonalization {
    return {
      userId,
      preferredTypes: ['friend_request', 'friend_post', 'achievement_unlocked'],
      mutedTypes: [],
      customFrequency: {
        friend_request: 10,
        friend_accepted: 10,
        friend_post: 20,
        post_like: 15,
        post_comment: 15,
        achievement_unlocked: 5,
        cuisine_milestone: 3,
        weekly_progress: 1,
        new_cuisine_available: 2,
        reminder: 5,
        system_announcement: 2,
      },
      contentPreferences: {
        showImages: true,
        showPreviews: true,
        useEmojis: true,
        shortMessages: false,
      },
      deliveryPreferences: {
        batchSimilar: true,
        delayNonUrgent: true,
        respectQuietHours: true,
        adaptToActivity: true,
      },
    };
  }

  private isInQuietHours(time: Date, quietHours: { start: number; end: number }): boolean {
    const hour = time.getHours();
    const { start, end } = quietHours;
    
    if (start <= end) {
      return hour >= start && hour < end;
    } else {
      // Quiet hours span midnight
      return hour >= start || hour < end;
    }
  }

  private getNextActiveTime(behaviorData: UserBehaviorData): Date {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find next active hour today
    const nextActiveHour = behaviorData.activeHours
      .filter(hour => hour > currentHour)
      .sort((a, b) => a - b)[0];

    if (nextActiveHour !== undefined) {
      const nextTime = new Date(now);
      nextTime.setHours(nextActiveHour, 0, 0, 0);
      return nextTime;
    }

    // No more active hours today, get first active hour tomorrow
    const tomorrowActiveHour = behaviorData.activeHours[0] || 9;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(tomorrowActiveHour, 0, 0, 0);
    return tomorrow;
  }

  private addEmojiToNotification(notification: NotificationEvent): NotificationEvent {
    const emojiMap: Record<NotificationType, string> = {
      friend_request: '👋',
      friend_accepted: '🎉',
      friend_post: '🍽️',
      post_like: '❤️',
      post_comment: '💬',
      achievement_unlocked: '🏆',
      cuisine_milestone: '⭐',
      weekly_progress: '📊',
      new_cuisine_available: '🌍',
      reminder: '⏰',
      system_announcement: '📢',
    };

    const emoji = emojiMap[notification.type] || '🔔';
    return {
      ...notification,
      title: `${emoji} ${notification.title}`,
    };
  }

  private async getRecentNotificationCount(userId: string, type: NotificationType): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('notification_history')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .gte('sent_at', today.toISOString());

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error getting recent notification count:', error);
      return 0;
    }
  }

  private getDefaultFrequencyLimit(type: NotificationType): number {
    const limits: Record<NotificationType, number> = {
      friend_request: 10,
      friend_accepted: 10,
      friend_post: 20,
      post_like: 15,
      post_comment: 15,
      achievement_unlocked: 5,
      cuisine_milestone: 3,
      weekly_progress: 1,
      new_cuisine_available: 2,
      reminder: 5,
      system_announcement: 2,
    };
    return limits[type] || 5;
  }

  private async saveBehaviorData(userId: string, data: UserBehaviorData): Promise<void> {
    try {
      await AsyncStorage.setItem(`${USER_BEHAVIOR_KEY}_${userId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving behavior data:', error);
    }
  }
}

// Export convenience functions
export const analyzeUserBehavior = (userId: string) => 
  SmartNotificationEngine.getInstance().analyzeUserBehavior(userId);

export const getOptimalNotificationTime = (
  userId: string, 
  notificationType: NotificationType, 
  urgency?: 'low' | 'medium' | 'high'
) => 
  SmartNotificationEngine.getInstance().getOptimalNotificationTime(userId, notificationType, urgency);

export const personalizeNotificationContent = (userId: string, notification: NotificationEvent) =>
  SmartNotificationEngine.getInstance().personalizeNotificationContent(userId, notification);

export const shouldSendNotificationNow = (
  userId: string, 
  notificationType: NotificationType, 
  urgency?: 'low' | 'medium' | 'high'
) =>
  SmartNotificationEngine.getInstance().shouldSendNotificationNow(userId, notificationType, urgency);

export const generatePersonalizationInsights = (userId: string) =>
  SmartNotificationEngine.getInstance().generatePersonalizationInsights(userId);