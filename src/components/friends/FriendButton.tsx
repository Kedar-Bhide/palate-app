import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FriendshipStatus } from '../../types/friends';
import { formatFriendshipStatus, getFriendshipStatusColor } from '../../lib/friendsUtils';
import { colors, spacing, radii, fonts } from '../../theme/uiTheme';

interface FriendButtonProps {
  userId: string;
  friendshipStatus: FriendshipStatus;
  onAddFriend: (userId: string) => Promise<void>;
  onAcceptRequest: (userId: string) => Promise<void>;
  onDeclineRequest: (userId: string) => Promise<void>;
  onRemoveFriend: (userId: string) => Promise<void>;
  onBlockUser: (userId: string) => Promise<void>;
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function FriendButton({
  userId,
  friendshipStatus,
  onAddFriend,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  onBlockUser,
  loading = false,
  size = 'medium',
  style,
}: FriendButtonProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const isLoading = loading || actionLoading;
  const buttonSizing = getButtonSizing(size);
  const statusColor = getFriendshipStatusColor(friendshipStatus);

  const handleHapticFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const executeAction = async (action: () => Promise<void>) => {
    if (isLoading) return;
    
    try {
      setActionLoading(true);
      handleHapticFeedback();
      await action();
    } catch (error) {
      console.error('Friend action error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFriend = () => {
    executeAction(() => onAddFriend(userId));
  };

  const handleAcceptRequest = () => {
    executeAction(() => onAcceptRequest(userId));
  };

  const handleDeclineRequest = () => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Decline', 
          style: 'destructive',
          onPress: () => executeAction(() => onDeclineRequest(userId))
        }
      ]
    );
  };

  const handleRemoveFriend = () => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this person from your friends?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => executeAction(() => onRemoveFriend(userId))
        }
      ]
    );
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will be removed from your friends and unable to contact you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => executeAction(() => onBlockUser(userId))
        }
      ]
    );
  };

  const handleFriendsOptions = () => {
    Alert.alert(
      'Friend Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove Friend', 
          style: 'destructive',
          onPress: handleRemoveFriend
        },
        { 
          text: 'Block User', 
          style: 'destructive',
          onPress: handleBlockUser
        }
      ]
    );
  };

  const renderButton = () => {
    switch (friendshipStatus) {
      case 'none':
        return (
          <TouchableOpacity
            style={[
              styles.button,
              buttonSizing,
              styles.primaryButton,
              isLoading && styles.disabledButton,
              style
            ]}
            onPress={handleAddFriend}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Adding...
              </Text>
            ) : (
              <>
                <Ionicons name="person-add" size={16} color={colors.white} />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Add Friend
                </Text>
              </>
            )}
          </TouchableOpacity>
        );

      case 'pending_sent':
        return (
          <TouchableOpacity
            style={[
              styles.button,
              buttonSizing,
              styles.secondaryButton,
              style
            ]}
            disabled
            activeOpacity={1}
          >
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Sent
            </Text>
          </TouchableOpacity>
        );

      case 'pending_received':
        return (
          <View style={[styles.buttonGroup, style]}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.smallButton,
                styles.successButton,
                isLoading && styles.disabledButton
              ]}
              onPress={handleAcceptRequest}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.smallButton,
                styles.dangerButton,
                isLoading && styles.disabledButton
              ]}
              onPress={handleDeclineRequest}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        );

      case 'friends':
        return (
          <TouchableOpacity
            style={[
              styles.button,
              buttonSizing,
              styles.friendsButton,
              style
            ]}
            onPress={handleFriendsOptions}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.buttonText, styles.friendsButtonText]}>
              Friends
            </Text>
          </TouchableOpacity>
        );

      case 'blocked_by_me':
        return (
          <TouchableOpacity
            style={[
              styles.button,
              buttonSizing,
              styles.dangerButton,
              style
            ]}
            disabled
            activeOpacity={1}
          >
            <Ionicons name="ban" size={16} color={colors.white} />
            <Text style={[styles.buttonText, styles.dangerButtonText]}>
              Blocked
            </Text>
          </TouchableOpacity>
        );

      case 'blocked_by_them':
        return (
          <TouchableOpacity
            style={[
              styles.button,
              buttonSizing,
              styles.disabledButton,
              style
            ]}
            disabled
            activeOpacity={1}
          >
            <Text style={[styles.buttonText, styles.disabledButtonText]}>
              Unavailable
            </Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return renderButton();
}

function getButtonSizing(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return {
        paddingHorizontal: spacing(1),
        paddingVertical: spacing(0.5),
        minWidth: 80,
      };
    case 'large':
      return {
        paddingHorizontal: spacing(2.5),
        paddingVertical: spacing(1.5),
        minWidth: 140,
      };
    case 'medium':
    default:
      return {
        paddingHorizontal: spacing(2),
        paddingVertical: spacing(1),
        minWidth: 100,
      };
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    gap: spacing(0.5),
  },

  buttonGroup: {
    flexDirection: 'row',
    gap: spacing(0.5),
  },

  smallButton: {
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.75),
    minWidth: 40,
  },

  buttonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },

  // Primary button (Add Friend)
  primaryButton: {
    backgroundColor: colors.primary,
  },

  primaryButtonText: {
    color: colors.white,
  },

  // Secondary button (Pending)
  secondaryButton: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },

  secondaryButtonText: {
    color: colors.textSecondary,
  },

  // Success button (Accept)
  successButton: {
    backgroundColor: colors.success,
  },

  successButtonText: {
    color: colors.white,
  },

  // Danger button (Decline/Block)
  dangerButton: {
    backgroundColor: colors.error,
  },

  dangerButtonText: {
    color: colors.white,
  },

  // Friends button
  friendsButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.success,
  },

  friendsButtonText: {
    color: colors.success,
  },

  // Disabled button
  disabledButton: {
    backgroundColor: colors.surfaceVariant,
    opacity: 0.6,
  },

  disabledButtonText: {
    color: colors.textSecondary,
  },
});