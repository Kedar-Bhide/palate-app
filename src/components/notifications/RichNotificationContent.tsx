import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Alert,
  Linking,
  Share,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationEvent, NotificationType } from '../../types/notifications';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface RichNotificationContentProps {
  notification: NotificationEvent;
  onInteraction: (action: string, data?: any) => void;
  onClose?: () => void;
  expanded?: boolean;
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  caption?: string;
}

interface InteractiveButton {
  id: string;
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_HEIGHT = 200;

export const RichNotificationContent: React.FC<RichNotificationContentProps> = ({
  notification,
  onInteraction,
  onClose,
  expanded = false,
}) => {
  const [replyText, setReplyText] = useState('');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleButtonPress = useCallback(async (action: string, data?: any) => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onInteraction(action, data);
  }, [onInteraction, scaleAnim]);

  const handleShare = useCallback(async () => {
    try {
      const shareContent = {
        title: notification.title,
        message: notification.body,
        url: notification.data?.shareUrl,
      };
      
      await Share.share(shareContent);
      onInteraction('shared', shareContent);
    } catch (error) {
      console.error('Error sharing notification:', error);
    }
  }, [notification, onInteraction]);

  const handleReply = useCallback(() => {
    if (replyText.trim()) {
      onInteraction('reply', { message: replyText.trim() });
      setReplyText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [replyText, onInteraction]);

  // Render media carousel
  const renderMediaCarousel = useCallback(() => {
    const mediaItems = getMediaItems(notification);
    if (!mediaItems || mediaItems.length === 0) return null;

    return (
      <View style={styles.mediaContainer}>
        <Image
          source={{ uri: mediaItems[currentMediaIndex].url }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
        
        {mediaItems.length > 1 && (
          <View style={styles.mediaIndicators}>
            {mediaItems.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.mediaIndicator,
                  index === currentMediaIndex && styles.activeMediaIndicator,
                ]}
                onPress={() => setCurrentMediaIndex(index)}
              />
            ))}
          </View>
        )}

        {mediaItems[currentMediaIndex].caption && (
          <View style={styles.mediaCaptionContainer}>
            <Text style={styles.mediaCaption}>
              {mediaItems[currentMediaIndex].caption}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => onInteraction('view_fullscreen', mediaItems[currentMediaIndex])}
        >
          <Ionicons name="expand" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }, [notification, currentMediaIndex, onInteraction]);

  // Render post preview for post-related notifications
  const renderPostPreview = useCallback(() => {
    if (!['friend_post', 'post_like', 'post_comment'].includes(notification.type)) {
      return null;
    }

    const { data } = notification;
    if (!data?.postId) return null;

    return (
      <TouchableOpacity
        style={styles.postPreview}
        onPress={() => onInteraction('view_post', { postId: data.postId })}
        activeOpacity={0.8}
      >
        {data.postImage && (
          <Image source={{ uri: data.postImage }} style={styles.postPreviewImage} />
        )}
        
        <View style={styles.postPreviewContent}>
          <Text style={styles.postPreviewTitle} numberOfLines={1}>
            {data.restaurantName || 'Restaurant'}
          </Text>
          <Text style={styles.postPreviewSubtitle} numberOfLines={1}>
            {data.cuisineName} • {data.rating && `${data.rating}⭐`}
          </Text>
          
          {data.review && (
            <Text style={styles.postPreviewReview} numberOfLines={2}>
              "{data.review}"
            </Text>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#999999" />
      </TouchableOpacity>
    );
  }, [notification, onInteraction]);

  // Render achievement display
  const renderAchievementDisplay = useCallback(() => {
    if (!['achievement_unlocked', 'cuisine_milestone'].includes(notification.type)) {
      return null;
    }

    const { data } = notification;

    return (
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FF8C00']}
        style={styles.achievementContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.achievementContent}>
          <Text style={styles.achievementIcon}>
            {data?.icon || '🏆'}
          </Text>
          
          <View style={styles.achievementText}>
            <Text style={styles.achievementTitle}>
              {data?.achievementName || 'Achievement Unlocked!'}
            </Text>
            <Text style={styles.achievementDescription}>
              {data?.achievementDescription || 'Great job on your food journey!'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.viewAchievementButton}
          onPress={() => onInteraction('view_achievement', data)}
        >
          <Text style={styles.viewAchievementText}>View Details</Text>
          <Ionicons name="trophy" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    );
  }, [notification, onInteraction]);

  // Render friend request actions
  const renderFriendRequestActions = useCallback(() => {
    if (notification.type !== 'friend_request') return null;

    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleButtonPress('accept_friend', notification.data)}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleButtonPress('decline_friend', notification.data)}
        >
          <Ionicons name="close" size={18} color="#666666" />
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.viewProfileButton]}
          onPress={() => handleButtonPress('view_profile', notification.data)}
        >
          <Ionicons name="person" size={18} color="#4A90E2" />
          <Text style={styles.viewProfileText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }, [notification, handleButtonPress]);

  // Render reply input
  const renderReplyInput = useCallback(() => {
    if (!['post_comment', 'friend_request'].includes(notification.type)) return null;

    return (
      <View style={styles.replyContainer}>
        <TextInput
          style={styles.replyInput}
          placeholder="Write a reply..."
          value={replyText}
          onChangeText={setReplyText}
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[
            styles.replyButton,
            !replyText.trim() && styles.replyButtonDisabled,
          ]}
          onPress={handleReply}
          disabled={!replyText.trim()}
        >
          <Ionicons 
            name="paper-plane" 
            size={18} 
            color={replyText.trim() ? "#4A90E2" : "#CCCCCC"} 
          />
        </TouchableOpacity>
      </View>
    );
  }, [replyText, handleReply]);

  // Render interactive buttons based on notification type
  const renderInteractiveButtons = useCallback(() => {
    const buttons = getInteractiveButtons(notification);
    if (!buttons || buttons.length === 0) return null;

    return (
      <View style={styles.interactiveButtonsContainer}>
        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.interactiveButton,
              styles[`${button.style || 'secondary'}Button`],
            ]}
            onPress={() => handleButtonPress(button.action, { buttonId: button.id })}
          >
            {button.icon && (
              <Ionicons 
                name={button.icon} 
                size={16} 
                color={getButtonTextColor(button.style)} 
              />
            )}
            <Text style={[
              styles.interactiveButtonText,
              { color: getButtonTextColor(button.style) },
            ]}>
              {button.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [notification, handleButtonPress]);

  // Render progress indicator for progress notifications
  const renderProgressIndicator = useCallback(() => {
    if (notification.type !== 'weekly_progress') return null;

    const progress = notification.data?.progress || 0;
    const goal = notification.data?.goal || 100;
    const percentage = Math.min((progress / goal) * 100, 100);

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Weekly Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${percentage}%` }]} />
        </View>
        
        <Text style={styles.progressSubtitle}>
          {progress} of {goal} cuisines explored
        </Text>
      </View>
    );
  }, [notification]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.notificationTypeIcon}>
            <Ionicons
              name={getNotificationIcon(notification.type)}
              size={20}
              color={getNotificationColor(notification.type)}
            />
          </View>
          <View>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationTime}>
              {formatRelativeTime(notification.sentAt)}
            </Text>
          </View>
        </View>
        
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#999999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.notificationBody}>{notification.body}</Text>

        {/* Rich Content Based on Type */}
        {renderMediaCarousel()}
        {renderPostPreview()}
        {renderAchievementDisplay()}
        {renderProgressIndicator()}

        {/* Interactive Elements */}
        {renderFriendRequestActions()}
        {renderInteractiveButtons()}
        {renderReplyInput()}

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBarButton}
            onPress={() => onInteraction('mark_read')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#4A90E2" />
            <Text style={styles.actionBarText}>Mark Read</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionBarButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color="#4A90E2" />
            <Text style={styles.actionBarText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionBarButton}
            onPress={() => onInteraction('save')}
          >
            <Ionicons name="bookmark-outline" size={20} color="#4A90E2" />
            <Text style={styles.actionBarText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// Helper functions
function getMediaItems(notification: NotificationEvent): MediaItem[] | null {
  const { data } = notification;
  
  if (data?.media) {
    return data.media as MediaItem[];
  }
  
  if (data?.postImage) {
    return [{
      type: 'image',
      url: data.postImage,
      caption: data?.review,
    }];
  }
  
  return null;
}

function getInteractiveButtons(notification: NotificationEvent): InteractiveButton[] | null {
  switch (notification.type) {
    case 'system_announcement':
      return [
        { id: 'learn_more', label: 'Learn More', action: 'learn_more', style: 'primary', icon: 'information-circle' },
        { id: 'dismiss', label: 'Dismiss', action: 'dismiss', style: 'secondary' },
      ];
    
    case 'new_cuisine_available':
      return [
        { id: 'explore_now', label: 'Explore Now', action: 'explore_cuisine', style: 'primary', icon: 'compass' },
        { id: 'remind_later', label: 'Remind Later', action: 'remind_later', style: 'secondary' },
      ];
    
    case 'weekly_progress':
      return [
        { id: 'view_details', label: 'View Details', action: 'view_progress', style: 'primary', icon: 'stats-chart' },
        { id: 'share_progress', label: 'Share', action: 'share_progress', style: 'secondary', icon: 'share' },
      ];
    
    default:
      return null;
  }
}

function getButtonTextColor(style?: string): string {
  switch (style) {
    case 'primary': return '#FFFFFF';
    case 'danger': return '#FFFFFF';
    case 'secondary':
    default: return '#666666';
  }
}

function getNotificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
    friend_request: 'person-add',
    friend_accepted: 'people',
    friend_post: 'restaurant',
    post_like: 'heart',
    post_comment: 'chatbubble',
    achievement_unlocked: 'trophy',
    cuisine_milestone: 'star',
    weekly_progress: 'stats-chart',
    new_cuisine_available: 'globe',
    reminder: 'time',
    system_announcement: 'megaphone',
  };
  return iconMap[type] || 'notifications';
}

function getNotificationColor(type: NotificationType): string {
  const colorMap: Record<NotificationType, string> = {
    friend_request: '#4A90E2',
    friend_accepted: '#4A90E2',
    friend_post: '#7ED321',
    post_like: '#E24A4A',
    post_comment: '#9013FE',
    achievement_unlocked: '#F5A623',
    cuisine_milestone: '#F5A623',
    weekly_progress: '#50C878',
    new_cuisine_available: '#FF6B6B',
    reminder: '#FFA500',
    system_announcement: '#1A1A1A',
  };
  return colorMap[type] || '#666666';
}

function formatRelativeTime(date?: Date): string {
  if (!date) return '';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  mediaContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: MEDIA_HEIGHT,
  },
  mediaIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    gap: 8,
  },
  mediaIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeMediaIndicator: {
    backgroundColor: '#FFFFFF',
  },
  mediaCaptionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  mediaCaption: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  postPreviewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  postPreviewContent: {
    flex: 1,
  },
  postPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  postPreviewSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  postPreviewReview: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  achievementContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  viewAchievementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  viewAchievementText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#4A90E2',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#F0F0F0',
  },
  declineButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  viewProfileButton: {
    backgroundColor: '#F0F8FF',
  },
  viewProfileText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  interactiveButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  interactiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  dangerButton: {
    backgroundColor: '#E24A4A',
  },
  interactiveButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    maxHeight: 80,
    fontSize: 14,
    color: '#1A1A1A',
    textAlignVertical: 'top',
  },
  replyButton: {
    padding: 8,
  },
  replyButtonDisabled: {
    opacity: 0.5,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionBarButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionBarText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
});