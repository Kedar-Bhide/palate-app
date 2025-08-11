import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendActivity, User } from '../../types/friends';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface FriendActivityFeedProps {
  activities: FriendActivity[];
  onActivityPress: (activity: FriendActivity) => void;
  onUserPress: (userId: string) => void;
  maxActivities?: number;
  showTimestamp?: boolean;
  compact?: boolean;
}

export default function FriendActivityFeed({
  activities,
  onActivityPress,
  onUserPress,
  maxActivities,
  showTimestamp = true,
  compact = false,
}: FriendActivityFeedProps) {
  const displayActivities = maxActivities ? activities.slice(0, maxActivities) : activities;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getActivityIcon = (type: FriendActivity['type']) => {
    switch (type) {
      case 'post_created':
        return { name: 'camera', color: colors.primary };
      case 'cuisine_tried':
        return { name: 'restaurant', color: colors.success };
      case 'achievement_unlocked':
        return { name: 'trophy', color: colors.accent };
      case 'friend_joined':
        return { name: 'person-add', color: colors.info };
      case 'milestone_reached':
        return { name: 'ribbon', color: colors.warning };
      default:
        return { name: 'notifications', color: colors.textSecondary };
    }
  };

  const renderActivityIcon = (activity: FriendActivity) => {
    const iconInfo = getActivityIcon(activity.type);
    
    return (
      <View style={[styles.activityIconContainer, { backgroundColor: iconInfo.color }]}>
        <Ionicons 
          name={iconInfo.name as any} 
          size={16} 
          color={colors.white} 
        />
      </View>
    );
  };

  const renderActivityContent = (activity: FriendActivity) => {
    return (
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <TouchableOpacity onPress={() => onUserPress(activity.user.id)}>
            <Text style={styles.userName}>
              {activity.user.display_name}
            </Text>
          </TouchableOpacity>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          {showTimestamp && (
            <Text style={styles.timestamp}>
              {formatTimeAgo(activity.created_at)}
            </Text>
          )}
        </View>

        <Text style={styles.activityDescription} numberOfLines={compact ? 2 : 3}>
          {activity.description}
        </Text>

        {activity.metadata?.cuisine_name && (
          <View style={styles.metadataContainer}>
            <Ionicons name="restaurant" size={14} color={colors.textSecondary} />
            <Text style={styles.metadataText}>
              {activity.metadata.cuisine_name}
            </Text>
          </View>
        )}

        {activity.metadata?.achievement_name && (
          <View style={styles.metadataContainer}>
            <Ionicons name="trophy" size={14} color={colors.accent} />
            <Text style={[styles.metadataText, { color: colors.accent }]}>
              {activity.metadata.achievement_name}
            </Text>
          </View>
        )}

        {activity.metadata?.milestone_type && (
          <View style={styles.metadataContainer}>
            <Ionicons name="ribbon" size={14} color={colors.warning} />
            <Text style={[styles.metadataText, { color: colors.warning }]}>
              {activity.metadata.milestone_type}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActivityThumbnail = (activity: FriendActivity) => {
    if (!activity.metadata?.photo_url) return null;

    return (
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: activity.metadata.photo_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </View>
    );
  };

  const renderUserAvatar = (user: User) => {
    if (user.avatar_url) {
      return (
        <Image
          source={{ uri: user.avatar_url }}
          style={styles.userAvatar}
          defaultSource={require('../../../assets/default-avatar.png')}
        />
      );
    }

    return (
      <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
        <Text style={styles.userAvatarInitial}>
          {user.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderActivityItem = (activity: FriendActivity, index: number) => {
    return (
      <TouchableOpacity
        key={activity.id}
        style={[
          styles.activityItem,
          compact && styles.activityItemCompact,
          index === displayActivities.length - 1 && styles.lastActivityItem,
        ]}
        onPress={() => onActivityPress(activity)}
        activeOpacity={0.8}
      >
        <View style={styles.activityLeft}>
          <TouchableOpacity onPress={() => onUserPress(activity.user.id)}>
            {renderUserAvatar(activity.user)}
          </TouchableOpacity>
          {renderActivityIcon(activity)}
        </View>

        {renderActivityContent(activity)}

        {renderActivityThumbnail(activity)}
      </TouchableOpacity>
    );
  };

  if (displayActivities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateEmoji}>📱</Text>
        <Text style={styles.emptyStateTitle}>No recent activity</Text>
        <Text style={styles.emptyStateMessage}>
          Your friends haven't been active recently.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayActivities.map((activity, index) => renderActivityItem(activity, index))}
      
      {maxActivities && activities.length > maxActivities && (
        <TouchableOpacity style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>
            View {activities.length - maxActivities} more activities
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },

  activityItem: {
    flexDirection: 'row',
    padding: spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  activityItemCompact: {
    paddingVertical: spacing(1.5),
  },

  lastActivityItem: {
    borderBottomWidth: 0,
  },

  activityLeft: {
    marginRight: spacing(1.5),
    alignItems: 'center',
    position: 'relative',
  },

  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },

  userAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  userAvatarInitial: {
    fontSize: 16,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  activityIconContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  activityContent: {
    flex: 1,
  },

  activityHeader: {
    marginBottom: spacing(0.75),
  },

  userName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  activityTitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  timestamp: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
    fontStyle: 'italic',
  },

  activityDescription: {
    fontSize: fonts.base,
    color: colors.text,
    lineHeight: fonts.base * 1.3,
    marginBottom: spacing(0.75),
  },

  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(0.5),
    gap: spacing(0.5),
  },

  metadataText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  thumbnailContainer: {
    marginLeft: spacing(1.5),
  },

  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
  },

  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    gap: spacing(0.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  viewMoreText: {
    fontSize: fonts.base,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(2),
  },

  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: spacing(2),
  },

  emptyStateTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },
});