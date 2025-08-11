import { 
  NotificationPayload, 
  NotificationSettings,
  NotificationType 
} from '../types/notifications';
import { getNotificationSettings } from './notificationStorage';
import { applyRateLimit } from './notificationScheduler';

// User interface for filtering
interface User {
  id: string;
  email: string;
  profile: {
    full_name: string;
    username: string;
    avatar_url?: string;
  } | null;
  notification_settings?: NotificationSettings;
  created_at?: string;
}

// Notification validation result
interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestion?: string;
}

// Duplicate detection configuration
interface DuplicateConfig {
  timeWindow: number; // in milliseconds
  similarityThreshold: number; // 0-1, where 1 is exact match
  maxSimilar: number; // max similar notifications allowed
}

// Spam prevention thresholds
const SPAM_THRESHOLDS = {
  maxNotificationsPerUser: 50, // per day
  maxSameTypePerUser: 10, // per hour
  minTimeBetweenSimilar: 5 * 60 * 1000, // 5 minutes
  maxBatchSize: 20,
};

// Content validation rules
const VALIDATION_RULES = {
  title: {
    minLength: 1,
    maxLength: 100,
    forbiddenChars: ['<', '>', '{', '}'],
  },
  body: {
    minLength: 1,
    maxLength: 300,
    forbiddenChars: ['<', '>', '{', '}'],
  },
};

// Duplicate detection configurations per notification type
const DUPLICATE_CONFIGS: Record<NotificationType, DuplicateConfig> = {
  friend_request: {
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    similarityThreshold: 0.9,
    maxSimilar: 1,
  },
  friend_accepted: {
    timeWindow: 24 * 60 * 60 * 1000,
    similarityThreshold: 0.9,
    maxSimilar: 1,
  },
  friend_post: {
    timeWindow: 60 * 60 * 1000, // 1 hour
    similarityThreshold: 0.7,
    maxSimilar: 5,
  },
  post_like: {
    timeWindow: 30 * 60 * 1000, // 30 minutes
    similarityThreshold: 0.8,
    maxSimilar: 3,
  },
  post_comment: {
    timeWindow: 15 * 60 * 1000, // 15 minutes
    similarityThreshold: 0.9,
    maxSimilar: 2,
  },
  achievement_unlocked: {
    timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    similarityThreshold: 1.0,
    maxSimilar: 1,
  },
  cuisine_milestone: {
    timeWindow: 24 * 60 * 60 * 1000,
    similarityThreshold: 0.9,
    maxSimilar: 1,
  },
  weekly_progress: {
    timeWindow: 7 * 24 * 60 * 60 * 1000,
    similarityThreshold: 0.9,
    maxSimilar: 1,
  },
  new_cuisine_available: {
    timeWindow: 24 * 60 * 60 * 1000,
    similarityThreshold: 0.8,
    maxSimilar: 3,
  },
  reminder: {
    timeWindow: 24 * 60 * 60 * 1000,
    similarityThreshold: 0.7,
    maxSimilar: 2,
  },
  system_announcement: {
    timeWindow: 7 * 24 * 60 * 60 * 1000,
    similarityThreshold: 0.9,
    maxSimilar: 1,
  },
};

// Recent notifications cache for duplicate detection
let recentNotifications: Array<{
  notification: NotificationPayload;
  timestamp: Date;
}> = [];

// Cleanup old notifications from cache
function cleanupRecentNotifications() {
  const now = new Date();
  const maxAge = Math.max(...Object.values(DUPLICATE_CONFIGS).map(c => c.timeWindow));
  
  recentNotifications = recentNotifications.filter(
    item => (now.getTime() - item.timestamp.getTime()) < maxAge
  );
}

// Main function to check if notification should be sent
export async function shouldSendNotification(
  notification: NotificationPayload, 
  user: User
): Promise<boolean> {
  try {
    // Basic validation first
    const validation = validateNotificationContent(notification);
    if (!validation.isValid) {
      console.log(`Notification blocked: ${validation.reason}`);
      return false;
    }

    // Check user preferences
    const userSettings = user.notification_settings || await getNotificationSettings();
    const passesPreferences = checkUserPreferences(notification, userSettings);
    if (!passesPreferences) {
      console.log('Notification blocked by user preferences');
      return false;
    }

    // Check rate limiting
    const notificationType = notification.data?.type as NotificationType;
    if (notificationType) {
      const passesRateLimit = await applyRateLimit(user.id, notificationType);
      if (!passesRateLimit) {
        console.log(`Notification blocked by rate limiting: ${notificationType}`);
        return false;
      }
    }

    // Check for duplicates
    const isDuplicate = detectDuplicate(notification);
    if (isDuplicate) {
      console.log('Notification blocked: duplicate detected');
      return false;
    }

    // Check spam prevention
    const passesSpamCheck = checkSpamPrevention(notification, user);
    if (!passesSpamCheck) {
      console.log('Notification blocked by spam prevention');
      return false;
    }

    // Check quiet hours if applicable
    const respectsQuietHours = checkQuietHours(userSettings);
    if (!respectsQuietHours) {
      console.log('Notification delayed: quiet hours active');
      return false; // This should be handled by scheduler instead
    }

    // All checks passed
    addToRecentNotifications(notification);
    return true;

  } catch (error) {
    console.error('Error in shouldSendNotification:', error);
    return false; // Fail safe - don't send if there's an error
  }
}

// Filter notifications by user preferences
export function filterByUserPreferences(
  notifications: NotificationPayload[], 
  userSettings: NotificationSettings
): NotificationPayload[] {
  return notifications.filter(notification => 
    checkUserPreferences(notification, userSettings)
  );
}

// Check if notification matches user preferences
function checkUserPreferences(
  notification: NotificationPayload,
  userSettings: NotificationSettings
): boolean {
  const notificationType = notification.data?.type as NotificationType;
  
  if (!notificationType) return true; // Allow if type is unknown

  // Map notification types to user settings
  switch (notificationType) {
    case 'friend_request':
    case 'friend_accepted':
      return userSettings.friendRequests;
    case 'friend_post':
      return userSettings.friendPosts;
    case 'post_like':
    case 'post_comment':
      return userSettings.likesAndComments;
    case 'new_cuisine_available':
      return userSettings.newCuisines;
    case 'achievement_unlocked':
    case 'cuisine_milestone':
      return true; // Always allow achievement notifications
    case 'weekly_progress':
      return userSettings.weeklyProgress;
    case 'reminder':
    case 'system_announcement':
      return true; // Always allow system notifications
    default:
      return true;
  }
}

// Detect duplicate notifications
export function detectDuplicateNotifications(
  notifications: NotificationPayload[]
): NotificationPayload[] {
  cleanupRecentNotifications();
  
  const uniqueNotifications: NotificationPayload[] = [];
  
  for (const notification of notifications) {
    if (!detectDuplicate(notification)) {
      uniqueNotifications.push(notification);
      addToRecentNotifications(notification);
    }
  }
  
  return uniqueNotifications;
}

// Check if notification is duplicate
function detectDuplicate(notification: NotificationPayload): boolean {
  const notificationType = notification.data?.type as NotificationType;
  if (!notificationType) return false;
  
  const config = DUPLICATE_CONFIGS[notificationType];
  const now = new Date();
  
  const recentSimilar = recentNotifications.filter(item => {
    // Check time window
    const timeDiff = now.getTime() - item.timestamp.getTime();
    if (timeDiff > config.timeWindow) return false;
    
    // Check similarity
    const similarity = calculateNotificationSimilarity(
      notification, 
      item.notification
    );
    
    return similarity >= config.similarityThreshold;
  });
  
  return recentSimilar.length >= config.maxSimilar;
}

// Calculate similarity between two notifications
function calculateNotificationSimilarity(
  notification1: NotificationPayload,
  notification2: NotificationPayload
): number {
  let similarityScore = 0;
  let factors = 0;
  
  // Compare notification type
  if (notification1.data?.type === notification2.data?.type) {
    similarityScore += 0.4;
  }
  factors++;
  
  // Compare recipient
  if (notification1.to === notification2.to) {
    similarityScore += 0.3;
  }
  factors++;
  
  // Compare title similarity
  const titleSimilarity = calculateTextSimilarity(
    notification1.title, 
    notification2.title
  );
  similarityScore += titleSimilarity * 0.2;
  factors++;
  
  // Compare body similarity
  const bodySimilarity = calculateTextSimilarity(
    notification1.body, 
    notification2.body
  );
  similarityScore += bodySimilarity * 0.1;
  factors++;
  
  return similarityScore / factors;
}

// Calculate text similarity using simple word overlap
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return totalWords > 0 ? commonWords.length / totalWords : 0;
}

// Add notification to recent cache
function addToRecentNotifications(notification: NotificationPayload) {
  recentNotifications.push({
    notification,
    timestamp: new Date(),
  });
  
  // Limit cache size
  if (recentNotifications.length > 1000) {
    recentNotifications = recentNotifications.slice(-500);
  }
}

// Apply rate limiting check
export async function applyRateLimitCheck(
  userId: string, 
  notificationType: NotificationType
): Promise<boolean> {
  return await applyRateLimit(userId, notificationType);
}

// Validate notification content
export function validateNotificationContent(
  notification: NotificationPayload
): ValidationResult {
  // Check title
  if (!notification.title || notification.title.trim().length === 0) {
    return {
      isValid: false,
      reason: 'Title is required',
      suggestion: 'Provide a non-empty title for the notification'
    };
  }
  
  if (notification.title.length < VALIDATION_RULES.title.minLength) {
    return {
      isValid: false,
      reason: 'Title too short',
      suggestion: `Title must be at least ${VALIDATION_RULES.title.minLength} characters`
    };
  }
  
  if (notification.title.length > VALIDATION_RULES.title.maxLength) {
    return {
      isValid: false,
      reason: 'Title too long',
      suggestion: `Title must be no more than ${VALIDATION_RULES.title.maxLength} characters`
    };
  }
  
  // Check for forbidden characters in title
  for (const char of VALIDATION_RULES.title.forbiddenChars) {
    if (notification.title.includes(char)) {
      return {
        isValid: false,
        reason: `Title contains forbidden character: ${char}`,
        suggestion: 'Remove special characters from title'
      };
    }
  }
  
  // Check body
  if (!notification.body || notification.body.trim().length === 0) {
    return {
      isValid: false,
      reason: 'Body is required',
      suggestion: 'Provide a non-empty body for the notification'
    };
  }
  
  if (notification.body.length < VALIDATION_RULES.body.minLength) {
    return {
      isValid: false,
      reason: 'Body too short',
      suggestion: `Body must be at least ${VALIDATION_RULES.body.minLength} characters`
    };
  }
  
  if (notification.body.length > VALIDATION_RULES.body.maxLength) {
    return {
      isValid: false,
      reason: 'Body too long',
      suggestion: `Body must be no more than ${VALIDATION_RULES.body.maxLength} characters`
    };
  }
  
  // Check for forbidden characters in body
  for (const char of VALIDATION_RULES.body.forbiddenChars) {
    if (notification.body.includes(char)) {
      return {
        isValid: false,
        reason: `Body contains forbidden character: ${char}`,
        suggestion: 'Remove special characters from body'
      };
    }
  }
  
  // Check push token
  if (!notification.to || notification.to.trim().length === 0) {
    return {
      isValid: false,
      reason: 'Push token is required',
      suggestion: 'Provide a valid push token'
    };
  }
  
  // Validate push token format (basic check)
  if (!isValidPushTokenFormat(notification.to)) {
    return {
      isValid: false,
      reason: 'Invalid push token format',
      suggestion: 'Provide a properly formatted push token'
    };
  }
  
  // Check data payload size (rough estimation)
  if (notification.data) {
    const dataSize = JSON.stringify(notification.data).length;
    if (dataSize > 4096) { // 4KB limit
      return {
        isValid: false,
        reason: 'Data payload too large',
        suggestion: 'Reduce the size of the data payload'
      };
    }
  }
  
  return { isValid: true };
}

// Check if push token format is valid
function isValidPushTokenFormat(token: string): boolean {
  // Expo push token format
  const expoTokenRegex = /^ExponentPushToken\[[a-f0-9-]{36}\]$/i;
  
  // FCM token format (for direct Firebase usage)
  const fcmTokenRegex = /^[a-zA-Z0-9_-]{140,}$/;
  
  return expoTokenRegex.test(token) || fcmTokenRegex.test(token);
}

// Check spam prevention
function checkSpamPrevention(
  notification: NotificationPayload, 
  user: User
): boolean {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Count notifications to this user in the last day
  const dailyCount = recentNotifications.filter(item => 
    item.notification.to === notification.to &&
    item.timestamp > oneDayAgo
  ).length;
  
  if (dailyCount >= SPAM_THRESHOLDS.maxNotificationsPerUser) {
    return false;
  }
  
  // Count same type notifications in the last hour
  const notificationType = notification.data?.type;
  if (notificationType) {
    const hourlyTypeCount = recentNotifications.filter(item =>
      item.notification.to === notification.to &&
      item.notification.data?.type === notificationType &&
      item.timestamp > oneHourAgo
    ).length;
    
    if (hourlyTypeCount >= SPAM_THRESHOLDS.maxSameTypePerUser) {
      return false;
    }
  }
  
  // Check minimum time between similar notifications
  const lastSimilar = recentNotifications
    .filter(item => 
      item.notification.to === notification.to &&
      calculateNotificationSimilarity(notification, item.notification) > 0.8
    )
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  
  if (lastSimilar) {
    const timeSinceLastSimilar = now.getTime() - lastSimilar.timestamp.getTime();
    if (timeSinceLastSimilar < SPAM_THRESHOLDS.minTimeBetweenSimilar) {
      return false;
    }
  }
  
  return true;
}

// Check quiet hours
function checkQuietHours(userSettings: NotificationSettings): boolean {
  if (!userSettings.quietHoursStart || !userSettings.quietHoursEnd) {
    return true; // No quiet hours set
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [quietStartHour, quietStartMin] = userSettings.quietHoursStart.split(':').map(Number);
  const [quietEndHour, quietEndMin] = userSettings.quietHoursEnd.split(':').map(Number);
  
  const quietStart = quietStartHour * 60 + quietStartMin;
  const quietEnd = quietEndHour * 60 + quietEndMin;
  
  // Handle quiet hours spanning midnight
  const isInQuietHours = quietStart > quietEnd
    ? (currentTime >= quietStart || currentTime <= quietEnd)
    : (currentTime >= quietStart && currentTime <= quietEnd);
  
  return !isInQuietHours;
}

// Batch validation for multiple notifications
export function validateNotificationBatch(
  notifications: NotificationPayload[]
): {
  valid: NotificationPayload[];
  invalid: Array<{ notification: NotificationPayload; reason: string }>;
} {
  const valid: NotificationPayload[] = [];
  const invalid: Array<{ notification: NotificationPayload; reason: string }> = [];
  
  if (notifications.length > SPAM_THRESHOLDS.maxBatchSize) {
    return {
      valid: [],
      invalid: notifications.map(notification => ({
        notification,
        reason: `Batch size too large (${notifications.length}/${SPAM_THRESHOLDS.maxBatchSize})`
      }))
    };
  }
  
  for (const notification of notifications) {
    const validation = validateNotificationContent(notification);
    if (validation.isValid) {
      valid.push(notification);
    } else {
      invalid.push({
        notification,
        reason: validation.reason || 'Validation failed'
      });
    }
  }
  
  return { valid, invalid };
}

// Get filtering statistics
export function getFilteringStats(): {
  recentNotificationsCount: number;
  cacheSize: number;
  duplicateConfigs: Record<NotificationType, DuplicateConfig>;
  spamThresholds: typeof SPAM_THRESHOLDS;
} {
  cleanupRecentNotifications();
  
  return {
    recentNotificationsCount: recentNotifications.length,
    cacheSize: JSON.stringify(recentNotifications).length,
    duplicateConfigs: DUPLICATE_CONFIGS,
    spamThresholds: SPAM_THRESHOLDS,
  };
}

// Clear notification cache (for testing or cleanup)
export function clearNotificationCache(): void {
  recentNotifications = [];
}

// Set custom duplicate configuration
export function setDuplicateConfig(
  type: NotificationType, 
  config: Partial<DuplicateConfig>
): void {
  DUPLICATE_CONFIGS[type] = {
    ...DUPLICATE_CONFIGS[type],
    ...config
  };
}