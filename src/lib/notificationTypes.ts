import { 
  NotificationPayload, 
  NotificationType, 
  NotificationTemplate,
  BatchNotificationPayload 
} from '../types/notifications';
import { getNotificationCategories } from './notifications';
import { getAllUserTokens } from './pushTokens';

// Types for notification data
interface User {
  id: string;
  email: string;
  profile: {
    full_name: string;
    username: string;
    avatar_url?: string;
  } | null;
}

interface Post {
  id: string;
  user_id: string;
  cuisine_name: string;
  restaurant_name?: string;
  created_at: string;
  content?: string;
  user?: User;
}

interface Cuisine {
  id: number;
  name: string;
  cuisine_type: string;
  description?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  cuisine_id?: number;
}

interface WeeklyStats {
  cuisinesTried: number;
  postsCreated: number;
  likesReceived: number;
  newFriends: number;
  totalExperiences: number;
  favoritesCuisine: string;
}

interface ScheduledNotification {
  id: string;
  notification: NotificationPayload;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  retryCount: number;
}

interface NotificationPriority {
  level: 'low' | 'normal' | 'high' | 'urgent';
  deliveryDelay?: number;
  batchable: boolean;
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  friend_request: {
    id: 'friend_request',
    type: 'friend_request',
    title: 'New Friend Request',
    body: '{fromName} wants to connect with you',
    data: {
      screen: 'FriendsScreen',
      tab: 'requests'
    },
    variables: ['fromName'],
  },
  friend_accepted: {
    id: 'friend_accepted',
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    body: '{userName} accepted your friend request',
    data: {
      screen: 'ProfileScreen'
    },
    variables: ['userName'],
  },
  friend_post: {
    id: 'friend_post',
    type: 'friend_post',
    title: '{userName} shared a new meal',
    body: 'Check out their {cuisineName} experience{restaurantName}',
    data: {
      screen: 'PostScreen'
    },
    variables: ['userName', 'cuisineName', 'restaurantName'],
  },
  post_like: {
    id: 'post_like',
    type: 'post_like',
    title: '{likerName} liked your post',
    body: 'Your {cuisineName} post{restaurantName}',
    data: {
      screen: 'PostScreen'
    },
    variables: ['likerName', 'cuisineName', 'restaurantName'],
  },
  post_comment: {
    id: 'post_comment',
    type: 'post_comment',
    title: '{commenterName} commented on your post',
    body: '{commentText}',
    data: {
      screen: 'PostScreen'
    },
    variables: ['commenterName', 'commentText'],
  },
  achievement_unlocked: {
    id: 'achievement_unlocked',
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked! 🏆',
    body: '{achievementName} - {achievementDescription}',
    data: {
      screen: 'AchievementsScreen'
    },
    variables: ['achievementName', 'achievementDescription'],
  },
  cuisine_milestone: {
    id: 'cuisine_milestone',
    type: 'cuisine_milestone',
    title: 'Cuisine Explorer! 🌍',
    body: 'You\'ve tried {count} different cuisines',
    data: {
      screen: 'ProgressScreen'
    },
    variables: ['count'],
  },
  weekly_progress: {
    id: 'weekly_progress',
    type: 'weekly_progress',
    title: 'Your Weekly Food Journey',
    body: 'You tried {cuisineCount} new cuisines and made {postCount} posts',
    data: {
      screen: 'ProgressScreen'
    },
    variables: ['cuisineCount', 'postCount'],
  },
  new_cuisine_available: {
    id: 'new_cuisine_available',
    type: 'new_cuisine_available',
    title: 'New Cuisine Available! 🍽️',
    body: 'Discover {cuisineName} - {description}',
    data: {
      screen: 'CuisineScreen'
    },
    variables: ['cuisineName', 'description'],
  },
  reminder: {
    id: 'reminder',
    type: 'reminder',
    title: 'Time to explore! 📱',
    body: 'Discover new flavors and share your food journey',
    data: {
      screen: 'HomeScreen'
    },
    variables: [],
  },
  system_announcement: {
    id: 'system_announcement',
    type: 'system_announcement',
    title: 'Palate Update',
    body: '{message}',
    data: {
      screen: 'HomeScreen'
    },
    variables: ['message'],
  },
};

// Notification priority mapping
const NOTIFICATION_PRIORITIES: Record<NotificationType, NotificationPriority> = {
  friend_request: { level: 'high', batchable: false },
  friend_accepted: { level: 'high', batchable: false },
  friend_post: { level: 'normal', deliveryDelay: 5 * 60 * 1000, batchable: true }, // 5 min delay
  post_like: { level: 'normal', deliveryDelay: 10 * 60 * 1000, batchable: true }, // 10 min delay
  post_comment: { level: 'normal', batchable: false },
  achievement_unlocked: { level: 'high', batchable: false },
  cuisine_milestone: { level: 'high', batchable: false },
  weekly_progress: { level: 'low', batchable: false },
  new_cuisine_available: { level: 'normal', batchable: true },
  reminder: { level: 'low', deliveryDelay: 60 * 60 * 1000, batchable: true }, // 1 hour delay
  system_announcement: { level: 'urgent', batchable: false },
};

// Helper function to interpolate template variables
function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  });
  return result;
}

// Helper function to get notification priority
export function getNotificationPriority(type: NotificationType): NotificationPriority {
  return NOTIFICATION_PRIORITIES[type] || { level: 'normal', batchable: false };
}

// Helper function to generate notification ID
function generateNotificationId(type: NotificationType, userId: string): string {
  return `${type}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Friend request notification
export async function createFriendRequestNotification(
  fromUser: User, 
  toUser: User
): Promise<NotificationPayload> {
  const template = NOTIFICATION_TEMPLATES.friend_request;
  const categories = getNotificationCategories();
  
  const variables = {
    fromName: fromUser.profile?.full_name || fromUser.profile?.username || 'Someone',
  };

  const tokens = await getAllUserTokens(toUser.id);
  if (tokens.length === 0) {
    throw new Error(`No push tokens found for user ${toUser.id}`);
  }

  return {
    to: tokens[0].token, // Use primary token
    sound: 'default',
    title: interpolateTemplate(template.title, variables),
    body: interpolateTemplate(template.body, variables),
    data: {
      ...template.data,
      notificationId: generateNotificationId('friend_request', toUser.id),
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      type: 'friend_request',
      timestamp: new Date().toISOString(),
    },
    badge: 1,
    priority: 'high',
    channelId: categories.friend_request,
  };
}

// Friend post notification (for multiple friends)
export async function createFriendPostNotification(
  post: Post, 
  friendUsers: User[]
): Promise<NotificationPayload[]> {
  const template = NOTIFICATION_TEMPLATES.friend_post;
  const categories = getNotificationCategories();
  const notifications: NotificationPayload[] = [];

  const variables = {
    userName: post.user?.profile?.full_name || post.user?.profile?.username || 'A friend',
    cuisineName: post.cuisine_name,
    restaurantName: post.restaurant_name ? ` at ${post.restaurant_name}` : '',
  };

  for (const friend of friendUsers) {
    const tokens = await getAllUserTokens(friend.id);
    
    for (const tokenInfo of tokens) {
      notifications.push({
        to: tokenInfo.token,
        sound: 'default',
        title: interpolateTemplate(template.title, variables),
        body: interpolateTemplate(template.body, variables),
        data: {
          ...template.data,
          notificationId: generateNotificationId('friend_post', friend.id),
          postId: post.id,
          postUserId: post.user_id,
          friendId: friend.id,
          type: 'friend_post',
          timestamp: new Date().toISOString(),
        },
        badge: 1,
        priority: 'normal',
        channelId: categories.friend_post,
      });
    }
  }

  return notifications;
}

// Like notification
export async function createLikeNotification(
  post: Post, 
  likerUser: User, 
  postOwner: User
): Promise<NotificationPayload> {
  const template = NOTIFICATION_TEMPLATES.post_like;
  const categories = getNotificationCategories();
  
  const variables = {
    likerName: likerUser.profile?.full_name || likerUser.profile?.username || 'Someone',
    cuisineName: post.cuisine_name,
    restaurantName: post.restaurant_name ? ` from ${post.restaurant_name}` : '',
  };

  const tokens = await getAllUserTokens(postOwner.id);
  if (tokens.length === 0) {
    throw new Error(`No push tokens found for user ${postOwner.id}`);
  }

  return {
    to: tokens[0].token,
    sound: 'default',
    title: interpolateTemplate(template.title, variables),
    body: interpolateTemplate(template.body, variables),
    data: {
      ...template.data,
      notificationId: generateNotificationId('post_like', postOwner.id),
      postId: post.id,
      likerId: likerUser.id,
      postOwnerId: postOwner.id,
      type: 'post_like',
      timestamp: new Date().toISOString(),
    },
    badge: 1,
    priority: 'normal',
    channelId: categories.post_like,
  };
}

// New cuisine notification (for friends)
export async function createNewCuisineNotification(
  cuisine: Cuisine, 
  user: User, 
  friends: User[]
): Promise<NotificationPayload[]> {
  const template = NOTIFICATION_TEMPLATES.cuisine_milestone;
  const categories = getNotificationCategories();
  const notifications: NotificationPayload[] = [];

  // This is for when user tries a new cuisine type, notify friends
  const variables = {
    userName: user.profile?.full_name || user.profile?.username || 'A friend',
    cuisineName: cuisine.name,
  };

  // Modify template for friend notification about new cuisine
  const friendTemplate = {
    ...template,
    title: `${variables.userName} tried ${cuisine.name}! 🌟`,
    body: `Check out their ${cuisine.name} experience`,
  };

  for (const friend of friends) {
    const tokens = await getAllUserTokens(friend.id);
    
    for (const tokenInfo of tokens) {
      notifications.push({
        to: tokenInfo.token,
        sound: 'default',
        title: friendTemplate.title,
        body: friendTemplate.body,
        data: {
          ...template.data,
          notificationId: generateNotificationId('new_cuisine_available', friend.id),
          cuisineId: cuisine.id,
          userId: user.id,
          friendId: friend.id,
          type: 'new_cuisine_available',
          timestamp: new Date().toISOString(),
        },
        badge: 1,
        priority: 'normal',
        channelId: categories.new_cuisine_available,
      });
    }
  }

  return notifications;
}

// Weekly progress notification
export async function createWeeklyProgressNotification(
  user: User, 
  stats: WeeklyStats
): Promise<NotificationPayload> {
  const template = NOTIFICATION_TEMPLATES.weekly_progress;
  const categories = getNotificationCategories();
  
  const variables = {
    cuisineCount: stats.cuisinesTried.toString(),
    postCount: stats.postsCreated.toString(),
  };

  // Create rich content based on stats
  let body = '';
  if (stats.cuisinesTried > 0 && stats.postsCreated > 0) {
    body = `You tried ${stats.cuisinesTried} new cuisines and made ${stats.postsCreated} posts`;
  } else if (stats.cuisinesTried > 0) {
    body = `You tried ${stats.cuisinesTried} new cuisines this week`;
  } else if (stats.postsCreated > 0) {
    body = `You made ${stats.postsCreated} posts this week`;
  } else {
    body = 'Ready to discover new flavors this week?';
  }

  if (stats.favoritesCuisine) {
    body += `. Your favorite was ${stats.favoritesCuisine}!`;
  }

  const tokens = await getAllUserTokens(user.id);
  if (tokens.length === 0) {
    throw new Error(`No push tokens found for user ${user.id}`);
  }

  return {
    to: tokens[0].token,
    sound: 'default',
    title: template.title,
    body,
    data: {
      ...template.data,
      notificationId: generateNotificationId('weekly_progress', user.id),
      userId: user.id,
      stats: stats,
      type: 'weekly_progress',
      timestamp: new Date().toISOString(),
    },
    badge: 1,
    priority: 'low',
    channelId: categories.weekly_progress,
  };
}

// Achievement notification
export async function createAchievementNotification(
  achievement: Achievement, 
  user: User
): Promise<NotificationPayload> {
  const template = NOTIFICATION_TEMPLATES.achievement_unlocked;
  const categories = getNotificationCategories();
  
  const variables = {
    achievementName: achievement.name,
    achievementDescription: achievement.description,
  };

  const tokens = await getAllUserTokens(user.id);
  if (tokens.length === 0) {
    throw new Error(`No push tokens found for user ${user.id}`);
  }

  return {
    to: tokens[0].token,
    sound: 'default',
    title: interpolateTemplate(template.title, variables),
    body: interpolateTemplate(template.body, variables),
    data: {
      ...template.data,
      notificationId: generateNotificationId('achievement_unlocked', user.id),
      achievementId: achievement.id,
      userId: user.id,
      type: 'achievement_unlocked',
      timestamp: new Date().toISOString(),
    },
    badge: 1,
    priority: 'high',
    channelId: categories.achievement_unlocked,
  };
}

// Comment notification
export async function createCommentNotification(
  post: Post,
  commenterUser: User,
  postOwner: User,
  commentText: string
): Promise<NotificationPayload> {
  const template = NOTIFICATION_TEMPLATES.post_comment;
  const categories = getNotificationCategories();
  
  const variables = {
    commenterName: commenterUser.profile?.full_name || commenterUser.profile?.username || 'Someone',
    commentText: commentText.length > 50 ? `${commentText.substring(0, 50)}...` : commentText,
  };

  const tokens = await getAllUserTokens(postOwner.id);
  if (tokens.length === 0) {
    throw new Error(`No push tokens found for user ${postOwner.id}`);
  }

  return {
    to: tokens[0].token,
    sound: 'default',
    title: interpolateTemplate(template.title, variables),
    body: interpolateTemplate(template.body, variables),
    data: {
      ...template.data,
      notificationId: generateNotificationId('post_comment', postOwner.id),
      postId: post.id,
      commenterId: commenterUser.id,
      postOwnerId: postOwner.id,
      type: 'post_comment',
      timestamp: new Date().toISOString(),
    },
    badge: 1,
    priority: 'normal',
    channelId: categories.post_comment,
  };
}

// Friend accepted notification
export async function createFriendAcceptedNotification(
  acceptedUser: User, 
  requesterUser: User
): Promise<NotificationPayload> {
  const template = NOTIFICATION_TEMPLATES.friend_accepted;
  const categories = getNotificationCategories();
  
  const variables = {
    userName: acceptedUser.profile?.full_name || acceptedUser.profile?.username || 'Someone',
  };

  const tokens = await getAllUserTokens(requesterUser.id);
  if (tokens.length === 0) {
    throw new Error(`No push tokens found for user ${requesterUser.id}`);
  }

  return {
    to: tokens[0].token,
    sound: 'default',
    title: interpolateTemplate(template.title, variables),
    body: interpolateTemplate(template.body, variables),
    data: {
      ...template.data,
      notificationId: generateNotificationId('friend_accepted', requesterUser.id),
      acceptedUserId: acceptedUser.id,
      requesterUserId: requesterUser.id,
      type: 'friend_accepted',
      timestamp: new Date().toISOString(),
    },
    badge: 1,
    priority: 'high',
    channelId: categories.friend_accepted,
  };
}

// Batch notifications by type and content similarity
export function batchSimilarNotifications(notifications: NotificationPayload[]): NotificationPayload[] {
  const batchableTypes = Object.entries(NOTIFICATION_PRIORITIES)
    .filter(([_, priority]) => priority.batchable)
    .map(([type, _]) => type);

  const batched: NotificationPayload[] = [];
  const groups = new Map<string, NotificationPayload[]>();

  // Group batchable notifications
  notifications.forEach(notification => {
    const type = notification.data?.type;
    if (batchableTypes.includes(type)) {
      const groupKey = `${type}_${notification.to}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(notification);
    } else {
      batched.push(notification);
    }
  });

  // Create batched notifications
  groups.forEach((groupNotifications, groupKey) => {
    if (groupNotifications.length === 1) {
      batched.push(groupNotifications[0]);
    } else {
      const [type, token] = groupKey.split('_', 2);
      const batchedNotification = createBatchedNotification(type as NotificationType, groupNotifications);
      batched.push(batchedNotification);
    }
  });

  return batched;
}

// Create a batched notification from multiple similar notifications
function createBatchedNotification(type: NotificationType, notifications: NotificationPayload[]): NotificationPayload {
  const count = notifications.length;
  const firstNotification = notifications[0];
  
  let title = '';
  let body = '';

  switch (type) {
    case 'friend_post':
      title = count > 1 ? `${count} friends shared new meals` : firstNotification.title;
      body = count > 1 ? 'Check out their latest food experiences' : firstNotification.body;
      break;
    case 'post_like':
      title = count > 1 ? `${count} people liked your posts` : firstNotification.title;
      body = count > 1 ? 'Your food posts are getting love!' : firstNotification.body;
      break;
    case 'new_cuisine_available':
      title = count > 1 ? `${count} friends tried new cuisines` : firstNotification.title;
      body = count > 1 ? 'Discover what your friends are eating' : firstNotification.body;
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
      batchedNotifications: notifications.map(n => n.data?.notificationId).filter(Boolean),
    },
    badge: count,
  };
}

export { 
  NOTIFICATION_TEMPLATES, 
  NOTIFICATION_PRIORITIES,
  type ScheduledNotification,
  type NotificationPriority 
};