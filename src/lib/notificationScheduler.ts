import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  NotificationPayload, 
  NotificationSettings,
  NotificationType 
} from '../types/notifications';
import { 
  NOTIFICATION_PRIORITIES,
  batchSimilarNotifications,
  type NotificationPriority,
  type ScheduledNotification
} from './notificationTypes';
import { getNotificationSettings } from './notificationStorage';
import { sendPushNotification } from './notifications';

const SCHEDULER_STORAGE_KEY = '@palate_notification_scheduler';
const DELIVERY_ANALYTICS_KEY = '@palate_delivery_analytics';

// User activity patterns for optimal delivery timing
interface UserActivityPattern {
  userId: string;
  peakHours: number[]; // Hours of day when user is most active
  timeZone: string;
  lastActiveTime: Date;
  weeklyPattern: Record<string, number[]>; // Day of week -> active hours
}

// Delivery analytics for optimization
interface DeliveryAnalytics {
  userId: string;
  notificationType: NotificationType;
  deliveryTime: Date;
  openedAt?: Date;
  dismissed: boolean;
  responseTime?: number; // Time to respond in seconds
}

// Rate limiting configuration
interface RateLimit {
  type: NotificationType;
  maxPerHour: number;
  maxPerDay: number;
  cooldownMinutes: number;
}

// User's current rate limit status
interface UserRateLimit {
  userId: string;
  type: NotificationType;
  hourlyCount: number;
  dailyCount: number;
  lastSent: Date;
  hourResetAt: Date;
  dayResetAt: Date;
}

// Default rate limits per notification type
const DEFAULT_RATE_LIMITS: Record<NotificationType, RateLimit> = {
  friend_request: { maxPerHour: 10, maxPerDay: 50, cooldownMinutes: 0 },
  friend_accepted: { maxPerHour: 10, maxPerDay: 50, cooldownMinutes: 0 },
  friend_post: { maxPerHour: 5, maxPerDay: 20, cooldownMinutes: 5 },
  post_like: { maxPerHour: 10, maxPerDay: 30, cooldownMinutes: 2 },
  post_comment: { maxPerHour: 15, maxPerDay: 50, cooldownMinutes: 1 },
  achievement_unlocked: { maxPerHour: 3, maxPerDay: 10, cooldownMinutes: 0 },
  cuisine_milestone: { maxPerHour: 2, maxPerDay: 5, cooldownMinutes: 0 },
  weekly_progress: { maxPerHour: 1, maxPerDay: 1, cooldownMinutes: 0 },
  new_cuisine_available: { maxPerHour: 3, maxPerDay: 10, cooldownMinutes: 15 },
  reminder: { maxPerHour: 1, maxPerDay: 3, cooldownMinutes: 60 },
  system_announcement: { maxPerHour: 2, maxPerDay: 5, cooldownMinutes: 0 },
};

// Persistent storage for scheduled notifications
let scheduledNotifications: Map<string, ScheduledNotification> = new Map();
let userRateLimits: Map<string, UserRateLimit[]> = new Map();
let userActivityPatterns: Map<string, UserActivityPattern> = new Map();
let deliveryAnalytics: DeliveryAnalytics[] = [];

// Load persisted data on startup
let initialized = false;

async function initialize() {
  if (initialized) return;
  
  try {
    const [schedulerData, analyticsData] = await Promise.all([
      AsyncStorage.getItem(SCHEDULER_STORAGE_KEY),
      AsyncStorage.getItem(DELIVERY_ANALYTICS_KEY)
    ]);
    
    if (schedulerData) {
      const data = JSON.parse(schedulerData);
      scheduledNotifications = new Map(data.scheduledNotifications || []);
      userRateLimits = new Map(data.userRateLimits || []);
      userActivityPatterns = new Map(data.userActivityPatterns || []);
    }
    
    if (analyticsData) {
      deliveryAnalytics = JSON.parse(analyticsData);
    }
    
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize notification scheduler:', error);
    initialized = true; // Continue with empty state
  }
}

// Persist data to storage
async function persistData() {
  try {
    const schedulerData = {
      scheduledNotifications: Array.from(scheduledNotifications.entries()),
      userRateLimits: Array.from(userRateLimits.entries()),
      userActivityPatterns: Array.from(userActivityPatterns.entries()),
    };
    
    await Promise.all([
      AsyncStorage.setItem(SCHEDULER_STORAGE_KEY, JSON.stringify(schedulerData)),
      AsyncStorage.setItem(DELIVERY_ANALYTICS_KEY, JSON.stringify(deliveryAnalytics))
    ]);
  } catch (error) {
    console.error('Failed to persist scheduler data:', error);
  }
}

// Schedule a notification for future delivery
export async function scheduleNotification(
  notification: NotificationPayload,
  deliveryTime: Date
): Promise<string> {
  await initialize();
  
  const notificationId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const scheduled: ScheduledNotification = {
    id: notificationId,
    notification: {
      ...notification,
      data: {
        ...notification.data,
        scheduledId: notificationId
      }
    },
    scheduledFor: deliveryTime,
    status: 'pending',
    retryCount: 0
  };
  
  scheduledNotifications.set(notificationId, scheduled);
  await persistData();
  
  console.log(`Notification scheduled for ${deliveryTime.toISOString()}`);
  return notificationId;
}

// Cancel a scheduled notification
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await initialize();
  
  const scheduled = scheduledNotifications.get(notificationId);
  if (scheduled) {
    scheduled.status = 'cancelled';
    scheduledNotifications.set(notificationId, scheduled);
    await persistData();
    console.log(`Notification ${notificationId} cancelled`);
  }
}

// Batch similar notifications to reduce spam
export function batchSimilarNotifications(notifications: NotificationPayload[]): NotificationPayload[] {
  // Group notifications by user and type
  const groups = new Map<string, NotificationPayload[]>();
  
  notifications.forEach(notification => {
    const userId = notification.data?.userId || 'unknown';
    const type = notification.data?.type || 'system_announcement';
    const priority = NOTIFICATION_PRIORITIES[type as NotificationType];
    
    if (priority?.batchable) {
      const groupKey = `${userId}_${type}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(notification);
    }
  });
  
  // Create batched notifications
  const batchedNotifications: NotificationPayload[] = [];
  
  groups.forEach((groupNotifications, groupKey) => {
    if (groupNotifications.length === 1) {
      batchedNotifications.push(groupNotifications[0]);
    } else {
      const [userId, type] = groupKey.split('_');
      const batchedNotification = createBatchedNotification(
        type as NotificationType, 
        groupNotifications
      );
      batchedNotifications.push(batchedNotification);
    }
  });
  
  // Add non-batchable notifications
  notifications.forEach(notification => {
    const type = notification.data?.type || 'system_announcement';
    const priority = NOTIFICATION_PRIORITIES[type as NotificationType];
    
    if (!priority?.batchable) {
      batchedNotifications.push(notification);
    }
  });
  
  return batchedNotifications;
}

// Create a batched notification
function createBatchedNotification(
  type: NotificationType,
  notifications: NotificationPayload[]
): NotificationPayload {
  const count = notifications.length;
  const firstNotification = notifications[0];
  
  let title = '';
  let body = '';
  
  switch (type) {
    case 'friend_post':
      title = `${count} friends shared new meals`;
      body = 'Check out their latest food experiences';
      break;
    case 'post_like':
      title = `${count} people liked your posts`;
      body = 'Your food posts are getting love!';
      break;
    case 'new_cuisine_available':
      title = `${count} friends tried new cuisines`;
      body = 'Discover what your friends are eating';
      break;
    default:
      title = firstNotification.title;
      body = firstNotification.body;
  }
  
  return {
    ...firstNotification,
    title,
    body,
    data: {
      ...firstNotification.data,
      batched: true,
      batchCount: count,
      batchedNotifications: notifications.map(n => n.data?.notificationId).filter(Boolean)
    },
    badge: count,
  };
}

// Get optimal delivery time based on user activity patterns
export async function getOptimalDeliveryTime(
  userId: string,
  priority: NotificationPriority
): Promise<Date> {
  await initialize();
  
  const now = new Date();
  
  // For urgent notifications, deliver immediately
  if (priority.level === 'urgent') {
    return now;
  }
  
  // Get user settings for quiet hours
  const userSettings = await getNotificationSettings();
  const adjustedTime = respectQuietHours(now, userSettings);
  
  // If not in quiet hours and high priority, deliver immediately
  if (priority.level === 'high' && adjustedTime.getTime() === now.getTime()) {
    return now;
  }
  
  // For normal/low priority, try to optimize delivery time
  const userPattern = userActivityPatterns.get(userId);
  if (userPattern) {
    const optimalTime = findOptimalTimeSlot(adjustedTime, userPattern, priority);
    return optimalTime;
  }
  
  // Default: apply any configured delivery delay
  if (priority.deliveryDelay) {
    return new Date(adjustedTime.getTime() + priority.deliveryDelay);
  }
  
  return adjustedTime;
}

// Respect user's quiet hours settings
export function respectQuietHours(
  deliveryTime: Date,
  userSettings: NotificationSettings
): Date {
  if (!userSettings.quietHoursStart || !userSettings.quietHoursEnd) {
    return deliveryTime;
  }
  
  const currentHour = deliveryTime.getHours();
  const currentMinute = deliveryTime.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [quietStartHour, quietStartMin] = userSettings.quietHoursStart.split(':').map(Number);
  const [quietEndHour, quietEndMin] = userSettings.quietHoursEnd.split(':').map(Number);
  
  const quietStart = quietStartHour * 60 + quietStartMin;
  const quietEnd = quietEndHour * 60 + quietEndMin;
  
  // Handle quiet hours spanning midnight
  const isInQuietHours = quietStart > quietEnd
    ? (currentTime >= quietStart || currentTime <= quietEnd)
    : (currentTime >= quietStart && currentTime <= quietEnd);
  
  if (isInQuietHours) {
    // Schedule for end of quiet hours
    const adjustedTime = new Date(deliveryTime);
    adjustedTime.setHours(quietEndHour, quietEndMin, 0, 0);
    
    // If quiet end is tomorrow, adjust date
    if (quietStart > quietEnd && currentTime >= quietStart) {
      adjustedTime.setDate(adjustedTime.getDate() + 1);
    }
    
    return adjustedTime;
  }
  
  return deliveryTime;
}

// Find optimal time slot based on user activity pattern
function findOptimalTimeSlot(
  baseTime: Date,
  userPattern: UserActivityPattern,
  priority: NotificationPriority
): Date {
  const currentHour = baseTime.getHours();
  const dayOfWeek = baseTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // Get user's active hours for this day
  const activeHours = userPattern.weeklyPattern[dayOfWeek] || userPattern.peakHours;
  
  // For low priority, try to deliver during peak activity
  if (priority.level === 'low') {
    const nextPeakHour = activeHours.find(hour => hour > currentHour) || activeHours[0];
    if (nextPeakHour !== undefined) {
      const optimalTime = new Date(baseTime);
      optimalTime.setHours(nextPeakHour, 0, 0, 0);
      
      // If next peak is tomorrow, adjust date
      if (nextPeakHour <= currentHour) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }
      
      return optimalTime;
    }
  }
  
  // For normal priority, deliver within reasonable time
  const maxDelay = priority.level === 'normal' ? 2 * 60 * 60 * 1000 : 0; // 2 hours max
  return new Date(baseTime.getTime() + (priority.deliveryDelay || 0) + maxDelay);
}

// Check if notification passes rate limiting
export async function applyRateLimit(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  await initialize();
  
  const rateLimit = DEFAULT_RATE_LIMITS[notificationType];
  const now = new Date();
  
  // Get or create user rate limit tracking
  let userLimits = userRateLimits.get(userId) || [];
  let typeLimit = userLimits.find(limit => limit.type === notificationType);
  
  if (!typeLimit) {
    typeLimit = {
      userId,
      type: notificationType,
      hourlyCount: 0,
      dailyCount: 0,
      lastSent: new Date(0),
      hourResetAt: new Date(now.getTime() + 60 * 60 * 1000),
      dayResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };
    userLimits.push(typeLimit);
    userRateLimits.set(userId, userLimits);
  }
  
  // Reset counters if time periods have elapsed
  if (now > typeLimit.hourResetAt) {
    typeLimit.hourlyCount = 0;
    typeLimit.hourResetAt = new Date(now.getTime() + 60 * 60 * 1000);
  }
  
  if (now > typeLimit.dayResetAt) {
    typeLimit.dailyCount = 0;
    typeLimit.dayResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  
  // Check cooldown period
  const timeSinceLastSent = now.getTime() - typeLimit.lastSent.getTime();
  const cooldownPeriod = rateLimit.cooldownMinutes * 60 * 1000;
  
  if (timeSinceLastSent < cooldownPeriod) {
    console.log(`Rate limit cooldown active for ${notificationType}: ${userId}`);
    return false;
  }
  
  // Check rate limits
  if (typeLimit.hourlyCount >= rateLimit.maxPerHour) {
    console.log(`Hourly rate limit reached for ${notificationType}: ${userId}`);
    return false;
  }
  
  if (typeLimit.dailyCount >= rateLimit.maxPerDay) {
    console.log(`Daily rate limit reached for ${notificationType}: ${userId}`);
    return false;
  }
  
  // Update counters
  typeLimit.hourlyCount++;
  typeLimit.dailyCount++;
  typeLimit.lastSent = now;
  
  await persistData();
  return true;
}

// Track user activity for pattern recognition
export async function trackUserActivity(userId: string, activityTime: Date = new Date()): Promise<void> {
  await initialize();
  
  let pattern = userActivityPatterns.get(userId);
  
  if (!pattern) {
    pattern = {
      userId,
      peakHours: [],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lastActiveTime: activityTime,
      weeklyPattern: {}
    };
  }
  
  // Update activity pattern
  const hour = activityTime.getHours();
  const dayOfWeek = activityTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  if (!pattern.weeklyPattern[dayOfWeek]) {
    pattern.weeklyPattern[dayOfWeek] = [];
  }
  
  if (!pattern.weeklyPattern[dayOfWeek].includes(hour)) {
    pattern.weeklyPattern[dayOfWeek].push(hour);
  }
  
  // Update overall peak hours
  if (!pattern.peakHours.includes(hour)) {
    pattern.peakHours.push(hour);
  }
  
  pattern.lastActiveTime = activityTime;
  userActivityPatterns.set(userId, pattern);
  
  await persistData();
}

// Track notification delivery analytics
export async function trackNotificationDelivery(
  userId: string,
  notificationType: NotificationType,
  deliveryTime: Date,
  opened: boolean = false,
  responseTimeMs?: number
): Promise<void> {
  await initialize();
  
  const analytics: DeliveryAnalytics = {
    userId,
    notificationType,
    deliveryTime,
    openedAt: opened ? new Date() : undefined,
    dismissed: !opened,
    responseTime: responseTimeMs ? Math.floor(responseTimeMs / 1000) : undefined
  };
  
  deliveryAnalytics.push(analytics);
  
  // Keep only last 1000 analytics entries
  if (deliveryAnalytics.length > 1000) {
    deliveryAnalytics = deliveryAnalytics.slice(-1000);
  }
  
  await persistData();
}

// Get scheduled notifications for processing
export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  await initialize();
  return Array.from(scheduledNotifications.values())
    .filter(scheduled => scheduled.status === 'pending');
}

// Process due scheduled notifications
export async function processDueNotifications(): Promise<void> {
  await initialize();
  
  const now = new Date();
  const dueNotifications = Array.from(scheduledNotifications.values())
    .filter(scheduled => 
      scheduled.status === 'pending' && 
      scheduled.scheduledFor <= now
    );
  
  if (dueNotifications.length === 0) return;
  
  console.log(`Processing ${dueNotifications.length} due notifications`);
  
  // Batch and send notifications
  const notifications = dueNotifications.map(s => s.notification);
  const batchedNotifications = batchSimilarNotifications(notifications);
  
  for (const notification of batchedNotifications) {
    try {
      const success = await sendPushNotification(notification.to, notification);
      
      // Update scheduled notification status
      const scheduledId = notification.data?.scheduledId;
      if (scheduledId) {
        const scheduled = scheduledNotifications.get(scheduledId);
        if (scheduled) {
          scheduled.status = success ? 'sent' : 'failed';
          if (!success && scheduled.retryCount < 3) {
            scheduled.status = 'pending';
            scheduled.scheduledFor = new Date(now.getTime() + 5 * 60 * 1000); // Retry in 5 minutes
            scheduled.retryCount++;
          }
          scheduledNotifications.set(scheduledId, scheduled);
        }
      }
      
      // Track delivery
      if (notification.data?.userId && notification.data?.type) {
        await trackNotificationDelivery(
          notification.data.userId,
          notification.data.type,
          now,
          false
        );
      }
      
    } catch (error) {
      console.error('Failed to send scheduled notification:', error);
    }
  }
  
  await persistData();
}

// Cleanup old data
export async function cleanupOldData(): Promise<void> {
  await initialize();
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Remove old scheduled notifications
  const toRemove: string[] = [];
  scheduledNotifications.forEach((scheduled, id) => {
    if (scheduled.scheduledFor < oneWeekAgo && scheduled.status !== 'pending') {
      toRemove.push(id);
    }
  });
  
  toRemove.forEach(id => scheduledNotifications.delete(id));
  
  // Remove old analytics
  deliveryAnalytics = deliveryAnalytics.filter(
    analytics => analytics.deliveryTime > oneWeekAgo
  );
  
  await persistData();
  console.log(`Cleaned up ${toRemove.length} old scheduled notifications`);
}

// Initialize cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (cleanupInterval) return;
  
  // Process due notifications every minute
  const processInterval = setInterval(processDueNotifications, 60 * 1000);
  
  // Cleanup old data every hour
  cleanupInterval = setInterval(cleanupOldData, 60 * 60 * 1000);
  
  console.log('Notification scheduler started');
}

export function stopScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  console.log('Notification scheduler stopped');
}