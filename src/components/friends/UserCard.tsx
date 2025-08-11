import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, FriendshipStatus, FriendAction } from '../../types/friends';
import { formatMutualFriendsCount, formatUserActivity } from '../../lib/friendsUtils';
import FriendButton from './FriendButton';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface UserCardProps {
  user: User;
  currentUserId: string;
  friendshipStatus: FriendshipStatus;
  mutualFriendsCount?: number;
  onPress: (userId: string) => void;
  onFriendAction: (userId: string, action: FriendAction) => Promise<void>;
  showActivity?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function UserCard({
  user,
  currentUserId,
  friendshipStatus,
  mutualFriendsCount = 0,
  onPress,
  onFriendAction,
  showActivity = false,
  size = 'medium',
  style,
}: UserCardProps) {
  const cardSizing = getCardSizing(size);
  const avatarSize = getAvatarSize(size);

  const handleCardPress = () => {
    onPress(user.id);
  };

  const handleFriendAction = async (action: FriendAction) => {
    await onFriendAction(user.id, action);
  };

  const renderAvatar = () => {
    const avatarStyle = [
      styles.avatar,
      { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
    ];

    if (user.avatar_url) {
      return (
        <Image
          source={{ uri: user.avatar_url }}
          style={avatarStyle}
          defaultSource={require('../../../assets/default-avatar.png')}
        />
      );
    }

    return (
      <View style={[avatarStyle, styles.avatarPlaceholder]}>
        <Text style={[styles.avatarInitial, { fontSize: avatarSize * 0.4 }]}>
          {user.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderUserInfo = () => (
    <View style={styles.userInfo}>
      <Text 
        style={[styles.displayName, cardSizing.nameText]} 
        numberOfLines={1}
      >
        {user.display_name}
      </Text>
      
      <Text 
        style={[styles.username, cardSizing.usernameText]} 
        numberOfLines={1}
      >
        @{user.username}
      </Text>

      {mutualFriendsCount > 0 && (
        <Text 
          style={[styles.mutualFriends, cardSizing.mutualText]} 
          numberOfLines={1}
        >
          {formatMutualFriendsCount(mutualFriendsCount)}
        </Text>
      )}

      {showActivity && (
        <Text 
          style={[styles.activity, cardSizing.activityText]} 
          numberOfLines={1}
        >
          {formatUserActivity(user)}
        </Text>
      )}

      {user.bio && size !== 'small' && (
        <Text 
          style={[styles.bio, cardSizing.bioText]} 
          numberOfLines={2}
        >
          {user.bio}
        </Text>
      )}
    </View>
  );

  const renderStats = () => {
    if (size === 'small') return null;

    return (
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.post_count}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.friend_count}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.cuisine_count}</Text>
          <Text style={styles.statLabel}>Cuisines</Text>
        </View>
      </View>
    );
  };

  const renderPrivacyIndicator = () => {
    if (!user.is_private) return null;

    return (
      <View style={styles.privacyIndicator}>
        <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, cardSizing.card, style]}
      onPress={handleCardPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          {renderAvatar()}
          {renderPrivacyIndicator()}
        </View>
        
        <View style={styles.headerContent}>
          {renderUserInfo()}
        </View>

        <View style={styles.actionContainer}>
          <FriendButton
            userId={user.id}
            friendshipStatus={friendshipStatus}
            onAddFriend={() => handleFriendAction('add_friend')}
            onAcceptRequest={() => handleFriendAction('accept_request')}
            onDeclineRequest={() => handleFriendAction('decline_request')}
            onRemoveFriend={() => handleFriendAction('remove_friend')}
            onBlockUser={() => handleFriendAction('block_user')}
            size={size === 'small' ? 'small' : 'medium'}
          />
        </View>
      </View>

      {size !== 'small' && renderStats()}
    </TouchableOpacity>
  );
}

function getCardSizing(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return {
        card: { minHeight: 80, paddingVertical: spacing(1), paddingHorizontal: spacing(1.5) },
        nameText: { fontSize: fonts.base },
        usernameText: { fontSize: fonts.sm },
        mutualText: { fontSize: fonts.xs },
        activityText: { fontSize: fonts.xs },
        bioText: { fontSize: fonts.sm },
      };
    case 'large':
      return {
        card: { minHeight: 160, paddingVertical: spacing(2.5), paddingHorizontal: spacing(2.5) },
        nameText: { fontSize: fonts.xl },
        usernameText: { fontSize: fonts.base },
        mutualText: { fontSize: fonts.sm },
        activityText: { fontSize: fonts.sm },
        bioText: { fontSize: fonts.base },
      };
    case 'medium':
    default:
      return {
        card: { minHeight: 120, paddingVertical: spacing(2), paddingHorizontal: spacing(2) },
        nameText: { fontSize: fonts.lg },
        usernameText: { fontSize: fonts.base },
        mutualText: { fontSize: fonts.sm },
        activityText: { fontSize: fonts.sm },
        bioText: { fontSize: fonts.base },
      };
  }
}

function getAvatarSize(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small': return 48;
    case 'large': return 80;
    case 'medium':
    default: return 64;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    marginVertical: spacing(0.5),
    ...shadows.small,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avatarContainer: {
    position: 'relative',
    marginRight: spacing(1.5),
  },

  avatar: {
    backgroundColor: colors.surfaceVariant,
  },

  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  avatarInitial: {
    color: colors.white,
    fontWeight: fonts.weights.bold,
  },

  privacyIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },

  userInfo: {
    flex: 1,
  },

  displayName: {
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  username: {
    color: colors.textSecondary,
    marginBottom: spacing(0.25),
  },

  mutualFriends: {
    color: colors.primary,
    fontWeight: fonts.weights.medium,
    marginBottom: spacing(0.25),
  },

  activity: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing(0.25),
  },

  bio: {
    color: colors.textSecondary,
    lineHeight: fonts.base * 1.3,
    marginTop: spacing(0.5),
  },

  actionContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing(1.5),
    paddingTop: spacing(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  statLabel: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});