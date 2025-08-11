import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationStats, NotificationType } from '../types/notifications';
import { supabase } from '../lib/supabase';

interface EngagementPattern {
  notificationType: NotificationType;
  openRate: number;
  avgResponseTime: number; // in seconds
  bestDeliveryHours: number[];
  worstDeliveryHours: number[];
  weeklyTrend: Record<string, number>; // day -> engagement score
}

interface NotificationAnalyticsEvent {
  id: string;
  userId: string;
  notificationId: string;
  notificationType: NotificationType;
  event: 'sent' | 'delivered' | 'opened' | 'dismissed' | 'clicked';
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface UseNotificationAnalyticsReturn {
  // State
  notificationStats: NotificationStats;
  engagementPatterns: EngagementPattern[];
  analyticsEnabled: boolean;
  loading: boolean;

  // Actions
  trackNotificationSent: (notificationId: string, type: NotificationType) => Promise<void>;
  trackNotificationOpened: (notificationId: string) => Promise<void>;
  trackNotificationDismissed: (notificationId: string) => Promise<void>;
  trackNotificationClicked: (notificationId: string, action?: string) => Promise<void>;
  getNotificationStats: (timeRange: string) => Promise<NotificationStats>;
  analyzeEngagementPatterns: (userId: string) => Promise<EngagementPattern[]>;
  generateAnalyticsReport: (timeRange: string) => Promise<string>;
  exportAnalyticsData: () => Promise<string>;
  toggleAnalytics: (enabled: boolean) => Promise<void>;
}

const ANALYTICS_STORAGE_KEY = '@palate_notification_analytics';
const ANALYTICS_SETTINGS_KEY = '@palate_analytics_settings';

export const useNotificationAnalytics = (userId?: string): UseNotificationAnalyticsReturn => {
  // State
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    sent: 0,
    delivered: 0,
    opened: 0,
    failed: 0,
    lastSent: undefined,
  });
  const [engagementPatterns, setEngagementPatterns] = useState<EngagementPattern[]>([]);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Load analytics settings on mount
  useEffect(() => {
    const loadAnalyticsSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem(ANALYTICS_SETTINGS_KEY);
        if (settings) {
          const { enabled } = JSON.parse(settings);
          setAnalyticsEnabled(enabled);
        }
      } catch (error) {
        console.error('Failed to load analytics settings:', error);
      }
    };

    loadAnalyticsSettings();
  }, []);

  // Load initial stats if userId is provided
  useEffect(() => {
    if (userId && analyticsEnabled) {
      loadNotificationStats('7d');
      analyzeEngagementPatterns(userId);
    }
  }, [userId, analyticsEnabled]);

  // Track notification sent
  const trackNotificationSent = useCallback(async (
    notificationId: string,
    type: NotificationType
  ) => {
    if (!analyticsEnabled || !userId) return;

    try {
      const event: NotificationAnalyticsEvent = {
        id: `${notificationId}_sent_${Date.now()}`,
        userId,
        notificationId,
        notificationType: type,
        event: 'sent',
        timestamp: new Date(),
      };

      await storeAnalyticsEvent(event);
      await updateNotificationStats('sent');
    } catch (error) {
      console.error('Failed to track notification sent:', error);
    }
  }, [analyticsEnabled, userId]);

  // Track notification opened
  const trackNotificationOpened = useCallback(async (notificationId: string) => {
    if (!analyticsEnabled || !userId) return;

    try {
      // Get notification type from stored data
      const type = await getNotificationTypeById(notificationId);
      
      const event: NotificationAnalyticsEvent = {
        id: `${notificationId}_opened_${Date.now()}`,
        userId,
        notificationId,
        notificationType: type,
        event: 'opened',
        timestamp: new Date(),
        metadata: {
          responseTime: await calculateResponseTime(notificationId)
        }
      };

      await storeAnalyticsEvent(event);
      await updateNotificationStats('opened');
    } catch (error) {
      console.error('Failed to track notification opened:', error);
    }
  }, [analyticsEnabled, userId]);

  // Track notification dismissed
  const trackNotificationDismissed = useCallback(async (notificationId: string) => {
    if (!analyticsEnabled || !userId) return;

    try {
      const type = await getNotificationTypeById(notificationId);
      
      const event: NotificationAnalyticsEvent = {
        id: `${notificationId}_dismissed_${Date.now()}`,
        userId,
        notificationId,
        notificationType: type,
        event: 'dismissed',
        timestamp: new Date(),
      };

      await storeAnalyticsEvent(event);
    } catch (error) {
      console.error('Failed to track notification dismissed:', error);
    }
  }, [analyticsEnabled, userId]);

  // Track notification clicked
  const trackNotificationClicked = useCallback(async (
    notificationId: string,
    action?: string
  ) => {
    if (!analyticsEnabled || !userId) return;

    try {
      const type = await getNotificationTypeById(notificationId);
      
      const event: NotificationAnalyticsEvent = {
        id: `${notificationId}_clicked_${Date.now()}`,
        userId,
        notificationId,
        notificationType: type,
        event: 'clicked',
        timestamp: new Date(),
        metadata: {
          action,
          responseTime: await calculateResponseTime(notificationId)
        }
      };

      await storeAnalyticsEvent(event);
    } catch (error) {
      console.error('Failed to track notification clicked:', error);
    }
  }, [analyticsEnabled, userId]);

  // Get notification stats for a time range
  const getNotificationStats = useCallback(async (
    timeRange: string
  ): Promise<NotificationStats> => {
    if (!analyticsEnabled || !userId) {
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        failed: 0,
      };
    }

    setLoading(true);
    
    try {
      const startDate = getStartDateFromRange(timeRange);
      
      // Get stats from database
      const { data: events, error } = await supabase
        .from('notification_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString());

      if (error) throw error;

      const stats: NotificationStats = {
        sent: events?.filter(e => e.event === 'sent').length || 0,
        delivered: events?.filter(e => e.event === 'delivered').length || 0,
        opened: events?.filter(e => e.event === 'opened').length || 0,
        failed: events?.filter(e => e.event === 'failed').length || 0,
        lastSent: events?.length > 0 
          ? new Date(Math.max(...events.map(e => new Date(e.timestamp).getTime())))
          : undefined,
      };

      setNotificationStats(stats);
      return stats;
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return notificationStats;
    } finally {
      setLoading(false);
    }
  }, [analyticsEnabled, userId, notificationStats]);

  // Load notification stats helper
  const loadNotificationStats = useCallback(async (timeRange: string) => {
    const stats = await getNotificationStats(timeRange);
    setNotificationStats(stats);
  }, [getNotificationStats]);

  // Analyze engagement patterns
  const analyzeEngagementPatterns = useCallback(async (
    targetUserId: string
  ): Promise<EngagementPattern[]> => {
    if (!analyticsEnabled) return [];

    setLoading(true);

    try {
      // Get analytics events from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: events, error } = await supabase
        .from('notification_analytics')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('timestamp', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const patterns: EngagementPattern[] = [];
      const notificationTypes = [...new Set(events?.map(e => e.notification_type) || [])];

      for (const type of notificationTypes) {
        const typeEvents = events?.filter(e => e.notification_type === type) || [];
        const sentEvents = typeEvents.filter(e => e.event === 'sent');
        const openedEvents = typeEvents.filter(e => e.event === 'opened');

        // Calculate open rate
        const openRate = sentEvents.length > 0 
          ? (openedEvents.length / sentEvents.length) * 100 
          : 0;

        // Calculate average response time
        const responseTimes = openedEvents
          .map(e => e.metadata?.responseTime)
          .filter(t => typeof t === 'number');
        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 0;

        // Analyze delivery hours
        const hourlyEngagement = new Map<number, { sent: number; opened: number }>();
        
        typeEvents.forEach(event => {
          const hour = new Date(event.timestamp).getHours();
          if (!hourlyEngagement.has(hour)) {
            hourlyEngagement.set(hour, { sent: 0, opened: 0 });
          }
          
          const hourData = hourlyEngagement.get(hour)!;
          if (event.event === 'sent') hourData.sent++;
          if (event.event === 'opened') hourData.opened++;
        });

        const hourlyRates = Array.from(hourlyEngagement.entries())
          .map(([hour, data]) => ({
            hour,
            rate: data.sent > 0 ? (data.opened / data.sent) * 100 : 0
          }))
          .sort((a, b) => b.rate - a.rate);

        const bestDeliveryHours = hourlyRates.slice(0, 3).map(h => h.hour);
        const worstDeliveryHours = hourlyRates.slice(-3).map(h => h.hour);

        // Weekly trend analysis
        const weeklyTrend: Record<string, number> = {};
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        daysOfWeek.forEach(day => {
          const dayEvents = typeEvents.filter(e => 
            new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day
          );
          const daySent = dayEvents.filter(e => e.event === 'sent').length;
          const dayOpened = dayEvents.filter(e => e.event === 'opened').length;
          
          weeklyTrend[day] = daySent > 0 ? (dayOpened / daySent) * 100 : 0;
        });

        patterns.push({
          notificationType: type as NotificationType,
          openRate,
          avgResponseTime,
          bestDeliveryHours,
          worstDeliveryHours,
          weeklyTrend,
        });
      }

      setEngagementPatterns(patterns);
      return patterns;
    } catch (error) {
      console.error('Failed to analyze engagement patterns:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [analyticsEnabled]);

  // Generate analytics report
  const generateAnalyticsReport = useCallback(async (timeRange: string): Promise<string> => {
    if (!userId) return 'No user specified';

    const stats = await getNotificationStats(timeRange);
    const patterns = await analyzeEngagementPatterns(userId);

    const report = `
# Notification Analytics Report (${timeRange})

## Summary Statistics
- Total Sent: ${stats.sent}
- Total Delivered: ${stats.delivered}
- Total Opened: ${stats.opened}
- Failed Deliveries: ${stats.failed}
- Overall Open Rate: ${stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0}%
- Last Sent: ${stats.lastSent ? stats.lastSent.toLocaleString() : 'Never'}

## Engagement Patterns by Type
${patterns.map(pattern => `
### ${pattern.notificationType.replace('_', ' ').toUpperCase()}
- Open Rate: ${pattern.openRate.toFixed(1)}%
- Avg Response Time: ${pattern.avgResponseTime.toFixed(1)}s
- Best Hours: ${pattern.bestDeliveryHours.map(h => `${h}:00`).join(', ')}
- Weekly Best: ${Object.entries(pattern.weeklyTrend)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 2)
  .map(([day, rate]) => `${day} (${rate.toFixed(1)}%)`)
  .join(', ')}
`).join('')}

## Recommendations
${generateRecommendations(stats, patterns)}
`;

    return report;
  }, [userId, getNotificationStats, analyzeEngagementPatterns]);

  // Export analytics data
  const exportAnalyticsData = useCallback(async (): Promise<string> => {
    if (!userId || !analyticsEnabled) return '';

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: events, error } = await supabase
        .from('notification_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', thirtyDaysAgo.toISOString());

      if (error) throw error;

      return JSON.stringify(events || [], null, 2);
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      return '';
    }
  }, [userId, analyticsEnabled]);

  // Toggle analytics
  const toggleAnalytics = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(
        ANALYTICS_SETTINGS_KEY, 
        JSON.stringify({ enabled })
      );
      setAnalyticsEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle analytics:', error);
    }
  }, []);

  // Helper functions
  const storeAnalyticsEvent = async (event: NotificationAnalyticsEvent) => {
    try {
      // Store in database
      const { error } = await supabase
        .from('notification_analytics')
        .insert({
          id: event.id,
          user_id: event.userId,
          notification_id: event.notificationId,
          notification_type: event.notificationType,
          event: event.event,
          timestamp: event.timestamp.toISOString(),
          metadata: event.metadata || {},
        });

      if (error) throw error;

      // Also store locally as backup
      const localEvents = await getLocalAnalyticsEvents();
      localEvents.push(event);
      
      // Keep only last 500 events locally
      const recentEvents = localEvents.slice(-500);
      await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to store analytics event:', error);
      
      // Fallback to local storage only
      try {
        const localEvents = await getLocalAnalyticsEvents();
        localEvents.push(event);
        await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(localEvents.slice(-500)));
      } catch (localError) {
        console.error('Failed to store analytics event locally:', localError);
      }
    }
  };

  const getLocalAnalyticsEvents = async (): Promise<NotificationAnalyticsEvent[]> => {
    try {
      const data = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get local analytics events:', error);
      return [];
    }
  };

  const updateNotificationStats = async (statType: 'sent' | 'opened') => {
    setNotificationStats(prev => ({
      ...prev,
      [statType]: prev[statType] + 1,
      lastSent: statType === 'sent' ? new Date() : prev.lastSent,
    }));
  };

  const getNotificationTypeById = async (notificationId: string): Promise<NotificationType> => {
    // This would typically query the notification storage or database
    // For now, we'll return a default type
    return 'system_announcement';
  };

  const calculateResponseTime = async (notificationId: string): Promise<number> => {
    try {
      const events = await getLocalAnalyticsEvents();
      const sentEvent = events.find(e => e.notificationId === notificationId && e.event === 'sent');
      
      if (sentEvent) {
        return Math.floor((Date.now() - sentEvent.timestamp.getTime()) / 1000);
      }
    } catch (error) {
      console.error('Failed to calculate response time:', error);
    }
    return 0;
  };

  const getStartDateFromRange = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const generateRecommendations = (
    stats: NotificationStats, 
    patterns: EngagementPattern[]
  ): string => {
    const recommendations: string[] = [];
    
    // Overall engagement recommendations
    const overallOpenRate = stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0;
    
    if (overallOpenRate < 20) {
      recommendations.push('• Consider reducing notification frequency or improving content relevance');
    } else if (overallOpenRate > 50) {
      recommendations.push('• Great engagement! Consider slight increase in notification frequency');
    }

    // Type-specific recommendations
    patterns.forEach(pattern => {
      if (pattern.openRate < 15) {
        recommendations.push(`• ${pattern.notificationType}: Very low engagement - review content and timing`);
      }
      
      if (pattern.bestDeliveryHours.length > 0) {
        recommendations.push(`• ${pattern.notificationType}: Schedule during ${pattern.bestDeliveryHours[0]}:00-${pattern.bestDeliveryHours[0] + 2}:00 for better engagement`);
      }
    });

    return recommendations.length > 0 ? recommendations.join('\n') : '• No specific recommendations at this time';
  };

  return {
    // State
    notificationStats,
    engagementPatterns,
    analyticsEnabled,
    loading,

    // Actions
    trackNotificationSent,
    trackNotificationOpened,
    trackNotificationDismissed,
    trackNotificationClicked,
    getNotificationStats,
    analyzeEngagementPatterns,
    generateAnalyticsReport,
    exportAnalyticsData,
    toggleAnalytics,
  };
};