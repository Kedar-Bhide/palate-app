/**
 * FriendCard Component
 * Reusable component for friend suggestions during onboarding
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../theme/uiTheme';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

interface FriendCardProps {
  name: string;
  username: string;
  avatar?: string;
  initials: string;
  mutualFriends?: number;
  isAdded?: boolean;
  onAddFriend: () => void;
  onRemoveFriend?: () => void;
}

export default function FriendCard({
  name,
  username,
  avatar,
  initials,
  mutualFriends = 0,
  isAdded = false,
  onAddFriend,
  onRemoveFriend,
}: FriendCardProps) {
  const handleButtonPress = () => {
    if (isAdded && onRemoveFriend) {
      onRemoveFriend();
    } else {
      onAddFriend();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <Avatar
          source={avatar}
          initials={initials}
          size="md"
        />
        
        <View style={styles.userInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.username}>@{username}</Text>
          {mutualFriends > 0 && (
            <Text style={styles.mutualFriends}>
              {mutualFriends} mutual friend{mutualFriends > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actionSection}>
        <Button
          variant={isAdded ? 'outline' : 'primary'}
          size="small"
          onPress={handleButtonPress}
          style={[
            styles.actionButton,
            isAdded && styles.addedButton,
          ]}
        >
          {isAdded ? (
            <View style={styles.buttonContent}>
              <MaterialIcons 
                name="check" 
                size={16} 
                color={colors.primary} 
                style={styles.buttonIcon}
              />
              <Text style={[styles.buttonText, styles.addedButtonText]}>
                Added
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <MaterialIcons 
                name="person-add" 
                size={16} 
                color={colors.background} 
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Add Friend</Text>
            </View>
          )}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    backgroundColor: colors.background,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.outline,
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
  },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userInfo: {
    marginLeft: spacing(2),
    flex: 1,
  },

  name: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  username: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    marginBottom: spacing(0.25),
  },

  mutualFriends: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
  },

  actionSection: {
    alignItems: 'flex-end',
  },

  actionButton: {
    minWidth: 100,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },

  addedButton: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonIcon: {
    marginRight: spacing(0.5),
  },

  buttonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.background,
  },

  addedButtonText: {
    color: colors.primary,
  },
});