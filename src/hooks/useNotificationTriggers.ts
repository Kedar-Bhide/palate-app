import { useState, useCallback, useRef, useEffect } from 'react';
import { NotificationPayload } from '../types/notifications';
import {
  createFriendRequestNotification,
  createFriendPostNotification,
  createLikeNotification,
  createCommentNotification,
  createFriendAcceptedNotification,
  createNewCuisineNotification,
  createWeeklyProgressNotification,
  createAchievementNotification,
  batchSimilarNotifications,
  getNotificationPriority,
  type ScheduledNotification
} from '../lib/notificationTypes';
import { sendPushNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { storeNotification } from '../lib/notificationStorage';

interface UseNotificationTriggersReturn {
  // State
  pendingNotifications: NotificationPayload[];
  scheduledNotifications: ScheduledNotification[];
  lastBatchSent: Date | null;
  isProcessing: boolean;
  
  // Trigger functions
  triggerFriendRequestNotification: (fromUserId: string, toUserId: string) => Promise<void>;
  triggerPostNotification: (postId: string) => Promise<void>;
  triggerLikeNotification: (postId: string, likerId: string) => Promise<void>;
  triggerCommentNotification: (postId: string, commenterId: string, commentText: string) => Promise<void>;
  triggerFriendAcceptedNotification: (acceptedUserId: string, requesterUserId: string) => Promise<void>;
  triggerCuisineNotification: (cuisineId: number, userId: string) => Promise<void>;
  triggerAchievementNotification: (achievementId: string, userId: string) => Promise<void>;
  scheduleWeeklyProgressNotifications: () => Promise<void>;
  
  // Processing functions
  batchNotifications: (notifications: NotificationPayload[]) => Promise<void>;
  processPendingNotifications: () => Promise<void>;
  clearPendingNotifications: () => void;
}

interface NotificationQueue {
  immediate: NotificationPayload[];
  delayed: NotificationPayload[];
  scheduled: ScheduledNotification[];
}

const BATCH_SIZE = 100;
const BATCH_DELAY = 30 * 1000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;

export const useNotificationTriggers = (): UseNotificationTriggersReturn => {
  // State
  const [pendingNotifications, setPendingNotifications] = useState<NotificationPayload[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [lastBatchSent, setLastBatchSent] = useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const queueRef = useRef<NotificationQueue>({
    immediate: [],
    delayed: [],
    scheduled: []
  });
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get user data
  const getUserData = useCallback(async (userId: string) => {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, profile:user_profiles(*)')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    return user;
  }, []);

  // Helper function to get post data
  const getPostData = useCallback(async (postId: string) => {
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(
          id,
          email,
          profile:user_profiles(*)
        )
      `)
      .eq('id', postId)
      .single();
    
    if (error || !post) {
      throw new Error(`Post not found: ${postId}`);
    }
    
    return post;
  }, []);

  // Helper function to get user's friends
  const getUserFriends = useCallback(async (userId: string) => {
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        friend:users!friendships_friend_id_fkey(
          id,
          email,
          profile:user_profiles(*)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');
    
    if (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
    
    return friendships?.map(f => f.friend) || [];
  }, []);

  // Helper function to add notification to queue
  const addToQueue = useCallback(async (notifications: NotificationPayload[]) => {
    for (const notification of notifications) {
      const priority = getNotificationPriority(notification.data?.type);
      
      if (priority.deliveryDelay && priority.deliveryDelay > 0) {
        // Add to delayed queue
        queueRef.current.delayed.push(notification);
      } else {
        // Add to immediate queue
        queueRef.current.immediate.push(notification);
      }
    }
    
    setPendingNotifications([
      ...queueRef.current.immediate,
      ...queueRef.current.delayed
    ]);
    
    // Process queue if not already processing
    if (!isProcessing) {
      processQueue();
    }
  }, [isProcessing]);

  // Process notification queue
  const processQueue = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Process immediate notifications first
      if (queueRef.current.immediate.length > 0) {
        const batch = queueRef.current.immediate.splice(0, BATCH_SIZE);
        const batchedNotifications = batchSimilarNotifications(batch);
        
        await sendNotificationBatch(batchedNotifications);
        setLastBatchSent(new Date());
      }
      
      // Schedule delayed notifications
      if (queueRef.current.delayed.length > 0) {
        const delayedBatch = queueRef.current.delayed.splice(0, BATCH_SIZE);
        delayedBatch.forEach(notification => {
          const priority = getNotificationPriority(notification.data?.type);
          const deliveryTime = new Date(Date.now() + (priority.deliveryDelay || 0));
          
          const scheduled: ScheduledNotification = {
            id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            notification,
            scheduledFor: deliveryTime,
            status: 'pending',
            retryCount: 0
          };
          
          queueRef.current.scheduled.push(scheduled);
        });
        
        setScheduledNotifications([...queueRef.current.scheduled]);
      }
      
      // Update pending notifications state
      setPendingNotifications([
        ...queueRef.current.immediate,
        ...queueRef.current.delayed
      ]);
      
      // Schedule next processing if there are more notifications
      if (queueRef.current.immediate.length > 0 || queueRef.current.delayed.length > 0) {
        processingTimerRef.current = setTimeout(() => {
          processQueue();
        }, BATCH_DELAY);
      }
      
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // Send batch of notifications
  const sendNotificationBatch = useCallback(async (notifications: NotificationPayload[]) => {
    const promises = notifications.map(async (notification) => {
      try {
        const success = await sendPushNotification(notification.to, notification);
        
        if (success) {
          // Store notification in history
          await storeNotification({
            id: notification.data?.notificationId || `notif_${Date.now()}`,
            type: notification.data?.type || 'system_announcement',
            userId: notification.data?.userId || '',
            title: notification.title,
            body: notification.body,
            data: notification.data,
            sentAt: new Date(),
          });
        }
        
        return { notification, success };
      } catch (error) {
        console.error('Failed to send notification:', error);
        return { notification, success: false };
      }
    });
    
    const results = await Promise.allSettled(promises);
    const failures = results
      .filter((result) => result.status === 'rejected' || !result.value?.success)
      .map((result) => result.status === 'fulfilled' ? result.value.notification : null)
      .filter(Boolean);
    
    console.log(`Sent ${notifications.length - failures.length}/${notifications.length} notifications successfully`);
    
    return failures;
  }, []);

  // Trigger friend request notification
  const triggerFriendRequestNotification = useCallback(async (
    fromUserId: string, 
    toUserId: string
  ) => {
    try {
      const [fromUser, toUser] = await Promise.all([
        getUserData(fromUserId),
        getUserData(toUserId)
      ]);
      
      const notification = await createFriendRequestNotification(fromUser, toUser);
      await addToQueue([notification]);
    } catch (error) {
      console.error('Failed to trigger friend request notification:', error);
    }
  }, [getUserData, addToQueue]);

  // Trigger post notification
  const triggerPostNotification = useCallback(async (postId: string) => {
    try {
      const post = await getPostData(postId);
      const friends = await getUserFriends(post.user_id);
      
      if (friends.length > 0) {
        const notifications = await createFriendPostNotification(post, friends);
        await addToQueue(notifications);
      }
    } catch (error) {
      console.error('Failed to trigger post notification:', error);
    }
  }, [getPostData, getUserFriends, addToQueue]);

  // Trigger like notification
  const triggerLikeNotification = useCallback(async (
    postId: string, 
    likerId: string
  ) => {
    try {
      const [post, liker] = await Promise.all([
        getPostData(postId),
        getUserData(likerId)
      ]);
      
      const postOwner = post.user;
      
      // Don't notify if user likes their own post
      if (likerId === postOwner.id) return;
      
      const notification = await createLikeNotification(post, liker, postOwner);
      await addToQueue([notification]);
    } catch (error) {
      console.error('Failed to trigger like notification:', error);
    }
  }, [getPostData, getUserData, addToQueue]);

  // Trigger comment notification
  const triggerCommentNotification = useCallback(async (
    postId: string,
    commenterId: string,
    commentText: string
  ) => {
    try {
      const [post, commenter] = await Promise.all([
        getPostData(postId),
        getUserData(commenterId)
      ]);
      
      const postOwner = post.user;
      
      // Don't notify if user comments on their own post
      if (commenterId === postOwner.id) return;
      
      const notification = await createCommentNotification(post, commenter, postOwner, commentText);
      await addToQueue([notification]);
    } catch (error) {
      console.error('Failed to trigger comment notification:', error);
    }
  }, [getPostData, getUserData, addToQueue]);

  // Trigger friend accepted notification
  const triggerFriendAcceptedNotification = useCallback(async (
    acceptedUserId: string,
    requesterUserId: string
  ) => {
    try {
      const [acceptedUser, requesterUser] = await Promise.all([
        getUserData(acceptedUserId),
        getUserData(requesterUserId)
      ]);
      
      const notification = await createFriendAcceptedNotification(acceptedUser, requesterUser);
      await addToQueue([notification]);
    } catch (error) {
      console.error('Failed to trigger friend accepted notification:', error);
    }
  }, [getUserData, addToQueue]);

  // Trigger cuisine notification
  const triggerCuisineNotification = useCallback(async (
    cuisineId: number,
    userId: string
  ) => {
    try {
      const [user, friends] = await Promise.all([
        getUserData(userId),
        getUserFriends(userId)
      ]);
      
      // Get cuisine data
      const { data: cuisine, error } = await supabase
        .from('cuisines')
        .select('*')
        .eq('id', cuisineId)
        .single();
      
      if (error || !cuisine || friends.length === 0) return;
      
      const notifications = await createNewCuisineNotification(cuisine, user, friends);
      await addToQueue(notifications);
    } catch (error) {
      console.error('Failed to trigger cuisine notification:', error);
    }
  }, [getUserData, getUserFriends, addToQueue]);

  // Trigger achievement notification
  const triggerAchievementNotification = useCallback(async (
    achievementId: string,
    userId: string
  ) => {
    try {
      const user = await getUserData(userId);
      
      // Get achievement data
      const { data: achievement, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('id', achievementId)
        .single();
      
      if (error || !achievement) return;
      
      const notification = await createAchievementNotification(achievement, user);
      await addToQueue([notification]);
    } catch (error) {
      console.error('Failed to trigger achievement notification:', error);
    }
  }, [getUserData, addToQueue]);

  // Schedule weekly progress notifications
  const scheduleWeeklyProgressNotifications = useCallback(async () => {
    try {
      // Get all users who should receive weekly progress
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          profile:user_profiles(*),
          notification_settings
        `);
      
      if (error || !users) return;
      
      // Filter users who have weekly progress enabled
      const eligibleUsers = users.filter(user => 
        user.notification_settings?.weeklyProgress !== false
      );
      
      const notifications: NotificationPayload[] = [];
      
      for (const user of eligibleUsers) {
        // Calculate weekly stats
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const [postsResult, experiencesResult] = await Promise.all([
          supabase
            .from('posts')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', oneWeekAgo.toISOString()),
          supabase
            .from('user_cuisine_experiences')
            .select('cuisine_id')
            .eq('user_id', user.id)
            .gte('created_at', oneWeekAgo.toISOString())
        ]);
        
        const postsCreated = postsResult.data?.length || 0;
        const cuisinesTried = new Set(experiencesResult.data?.map(e => e.cuisine_id) || []).size;
        
        const stats = {
          cuisinesTried,
          postsCreated,
          likesReceived: 0, // Would need to calculate from likes table
          newFriends: 0, // Would need to calculate from friendships table
          totalExperiences: experiencesResult.data?.length || 0,
          favoritesCuisine: '', // Would need more complex query
        };
        
        if (cuisinesTried > 0 || postsCreated > 0) {
          const notification = await createWeeklyProgressNotification(user, stats);
          notifications.push(notification);
        }
      }
      
      if (notifications.length > 0) {
        await addToQueue(notifications);
      }
    } catch (error) {
      console.error('Failed to schedule weekly progress notifications:', error);
    }
  }, [getUserData, addToQueue]);

  // Batch notifications manually
  const batchNotifications = useCallback(async (notifications: NotificationPayload[]) => {
    const batchedNotifications = batchSimilarNotifications(notifications);
    await sendNotificationBatch(batchedNotifications);
  }, [sendNotificationBatch]);

  // Process pending notifications manually
  const processPendingNotifications = useCallback(async () => {
    await processQueue();
  }, [processQueue]);

  // Clear pending notifications
  const clearPendingNotifications = useCallback(() => {
    queueRef.current.immediate = [];
    queueRef.current.delayed = [];
    setPendingNotifications([]);
  }, []);

  // Process scheduled notifications
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const readyNotifications = queueRef.current.scheduled.filter(
        scheduled => scheduled.status === 'pending' && scheduled.scheduledFor <= now
      );
      
      if (readyNotifications.length > 0) {
        const notifications = readyNotifications.map(s => s.notification);
        const failures = await sendNotificationBatch(notifications);
        
        // Update scheduled notification statuses
        queueRef.current.scheduled = queueRef.current.scheduled.map(scheduled => {
          const failed = failures.some(f => f?.data?.notificationId === scheduled.notification.data?.notificationId);
          
          if (readyNotifications.includes(scheduled)) {
            if (failed && scheduled.retryCount < MAX_RETRY_ATTEMPTS) {
              return {
                ...scheduled,
                scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
                retryCount: scheduled.retryCount + 1
              };
            } else {
              return {
                ...scheduled,
                status: failed ? 'failed' : 'sent'
              };
            }
          }
          
          return scheduled;
        });
        
        setScheduledNotifications([...queueRef.current.scheduled]);
      }
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(interval);
  }, [sendNotificationBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    pendingNotifications,
    scheduledNotifications,
    lastBatchSent,
    isProcessing,
    
    // Trigger functions
    triggerFriendRequestNotification,
    triggerPostNotification,
    triggerLikeNotification,
    triggerCommentNotification,
    triggerFriendAcceptedNotification,
    triggerCuisineNotification,
    triggerAchievementNotification,
    scheduleWeeklyProgressNotifications,
    
    // Processing functions
    batchNotifications,
    processPendingNotifications,
    clearPendingNotifications,
  };
};