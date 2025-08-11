import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanGestureHandler,
  State,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationEvent, NotificationType } from '../../types/notifications';

interface NotificationCardProps {
  notification: NotificationEvent;
  onPress: (notification: NotificationEvent) => void;
  onMarkRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  onReply?: (notificationId: string, message: string) => void;
  showActions?: boolean;
  expanded?: boolean;
}

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onMarkRead,
  onDelete,
  onReply,
  showActions = true,
  expanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const actionOpacity = useRef(new Animated.Value(0)).current;
  const expandHeight = useRef(new Animated.Value(0)).current;

  const isUnread = !notification.readAt;
  const hasRichContent = hasNotificationRichContent(notification);
  const canReply = canReplyToNotification(notification.type);

  // Handle swipe gesture
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      
      if (Math.abs(translationX) > SWIPE_THRESHOLD) {
        // Trigger action based on swipe direction
        if (translationX > 0) {
          // Swipe right - mark as read/unread
          handleToggleRead();
        } else {
          // Swipe left - delete
          handleDelete();
        }
      }
      
      // Reset position
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(actionOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (event.nativeEvent.state === State.BEGAN) {
      Animated.timing(actionOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [translateX, actionOpacity]);

  // Handle card press
  const handlePress = useCallback(() => {
    onPress(notification);
  }, [notification, onPress]);

  // Handle toggle read state
  const handleToggleRead = useCallback(() => {
    onMarkRead(notification.id);
  }, [notification.id, onMarkRead]);

  // Handle delete
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(notification.id),
        },
      ]
    );
  }, [notification.id, onDelete]);

  // Handle expand/collapse
  const handleToggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    Animated.timing(expandHeight, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, expandHeight]);

  // Handle reply
  const handleReply = useCallback(() => {
    if (onReply && replyText.trim()) {
      onReply(notification.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  }, [notification.id, replyText, onReply]);

  // Render notification icon
  const renderNotificationIcon = useCallback(() => {
    const iconName = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);
    
    return (
      <View style={[styles.notificationIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
    );
  }, [notification.type]);

  // Render rich content
  const renderRichContent = useCallback(() => {
    if (!hasRichContent || !isExpanded) return null;

    const { data } = notification;
    
    return (
      <Animated.View
        style={[
          styles.richContent,
          {
            opacity: expandHeight,
            maxHeight: expandHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 200],
            }),
          },
        ]}
      >
        {/* Post preview for post-related notifications */}
        {(notification.type === 'friend_post' || 
          notification.type === 'post_like' || 
          notification.type === 'post_comment') && data?.postId && (
          <View style={styles.postPreview}>
            {data.postImage && (
              <Image source={{ uri: data.postImage }} style={styles.postImage} />
            )}
            <View style={styles.postDetails}>
              <Text style={styles.postTitle} numberOfLines={1}>
                {data.restaurantName || 'Restaurant'}
              </Text>
              <Text style={styles.postSubtitle} numberOfLines={1}>
                {data.cuisineName || 'Cuisine'} • {data.rating && `${data.rating}⭐`}
              </Text>
            </View>
          </View>
        )}

        {/* Achievement preview */}
        {(notification.type === 'achievement_unlocked' || 
          notification.type === 'cuisine_milestone') && (
          <View style={styles.achievementPreview}>
            <Text style={styles.achievementIcon}>{data?.icon || '🏆'}</Text>
            <View style={styles.achievementDetails}>
              <Text style={styles.achievementName}>
                {data?.achievementName || 'Achievement'}
              </Text>
              <Text style={styles.achievementDescription}>
                {data?.achievementDescription || 'Great job!'}
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.richActions}>
          {notification.type === 'friend_request' && (
            <>
              <TouchableOpacity style={[styles.actionButton, styles.acceptButton]}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.declineButton]}>
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
          
          {canReply && (
            <TouchableOpacity
              style={[styles.actionButton, styles.replyButton]}
              onPress={() => setShowReplyInput(!showReplyInput)}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#4A90E2" />
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }, [hasRichContent, isExpanded, notification, expandHeight, canReply, showReplyInput]);

  // Render swipe actions
  const renderSwipeActions = useCallback(() => (
    <Animated.View style={[styles.swipeActions, { opacity: actionOpacity }]}>
      <View style={styles.leftAction}>
        <Ionicons 
          name={isUnread ? 'checkmark' : 'mail'} 
          size={24} 
          color="#FFFFFF" 
        />
        <Text style={styles.actionText}>
          {isUnread ? 'Mark Read' : 'Mark Unread'}
        </Text>
      </View>
      <View style={styles.rightAction}>
        <Ionicons name="trash" size={24} color="#FFFFFF" />
        <Text style={styles.actionText}>Delete</Text>
      </View>
    </Animated.View>
  ), [actionOpacity, isUnread]);

  return (
    <View style={styles.container}>
      {renderSwipeActions()}
      
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        enabled={showActions}
      >
        <Animated.View
          style={[
            styles.card,
            isUnread && styles.unreadCard,
            { transform: [{ translateX }] },
          ]}
        >
          <TouchableOpacity
            style={styles.cardContent}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            {renderNotificationIcon()}
            
            <View style={styles.notificationBody}>
              <View style={styles.notificationHeader}>
                <Text style={[styles.notificationTitle, isUnread && styles.unreadText]}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatRelativeTime(notification.sentAt)}
                </Text>
              </View>
              
              <Text style={styles.notificationDescription} numberOfLines={isExpanded ? undefined : 2}>
                {notification.body}
              </Text>

              {hasRichContent && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={handleToggleExpand}
                >
                  <Text style={styles.expandButtonText}>
                    {isExpanded ? 'Show less' : 'Show more'}
                  </Text>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color="#4A90E2" 
                  />
                </TouchableOpacity>
              )}
            </View>
            
            {isUnread && <View style={styles.unreadIndicator} />}
          </TouchableOpacity>

          {renderRichContent()}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// Helper functions
function getNotificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'friend_request': return 'person-add';
    case 'friend_accepted': return 'people';
    case 'friend_post': return 'restaurant';
    case 'post_like': return 'heart';
    case 'post_comment': return 'chatbubble';
    case 'achievement_unlocked': return 'trophy';
    case 'cuisine_milestone': return 'star';
    case 'weekly_progress': return 'stats-chart';
    case 'new_cuisine_available': return 'globe';
    case 'reminder': return 'time';
    case 'system_announcement': return 'megaphone';
    default: return 'notifications';
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted': return '#4A90E2';
    case 'friend_post': return '#7ED321';
    case 'post_like': return '#E24A4A';
    case 'post_comment': return '#9013FE';
    case 'achievement_unlocked':
    case 'cuisine_milestone': return '#F5A623';
    case 'weekly_progress': return '#50C878';
    case 'new_cuisine_available': return '#FF6B6B';
    case 'reminder': return '#FFA500';
    case 'system_announcement': return '#1A1A1A';
    default: return '#666666';
  }
}

function hasNotificationRichContent(notification: NotificationEvent): boolean {
  return ['friend_request', 'friend_post', 'post_like', 'post_comment', 'achievement_unlocked', 'cuisine_milestone'].includes(notification.type);
}

function canReplyToNotification(type: NotificationType): boolean {
  return ['friend_request', 'post_comment'].includes(type);
}

function formatRelativeTime(date?: Date): string {
  if (!date) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  swipeActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: -1,
  },
  leftAction: {
    flex: 1,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  rightAction: {
    flex: 1,
    backgroundColor: '#E24A4A',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadCard: {
    backgroundColor: '#F8F9FE',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
    marginLeft: 8,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginTop: 8,
    marginLeft: 8,
  },
  richContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  postPreview: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  postImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  postDetails: {
    flex: 1,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  postSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  achievementPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666666',
  },
  richActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  acceptButton: {
    backgroundColor: '#4A90E2',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  declineButton: {
    backgroundColor: '#F0F0F0',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  replyButton: {
    backgroundColor: '#F0F8FF',
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
  },
});