import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../types';
import { theme } from '../../theme';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
  onAvatarPress?: () => void;
  onFollowPress?: () => void;
  followStatus?: 'follow' | 'following' | 'friends' | 'blocked';
  onAvatarUpload?: (imageUri: string) => Promise<void>;
  isUpdating?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  isOwnProfile,
  onEditProfile,
  onAvatarPress,
  onFollowPress,
  followStatus,
  onAvatarUpload,
  isUpdating = false,
}) => {
  const handleAvatarPress = async () => {
    if (!isOwnProfile) {
      onAvatarPress?.();
      return;
    }

    // Show options for own profile
    Alert.alert(
      'Profile Photo',
      'Choose how you\'d like to update your profile photo',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Camera',
          onPress: () => openImagePicker('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => openImagePicker('library'),
        },
        ...(user.avatar_url ? [{
          text: 'Remove Photo',
          style: 'destructive' as const,
          onPress: () => handleRemovePhoto(),
        }] : []),
      ]
    );
  };

  const openImagePicker = async (type: 'camera' | 'library') => {
    try {
      const permissionResult = type === 'camera' 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          `Camera access is required to ${type === 'camera' ? 'take photos' : 'select photos from your library'}.`,
        );
        return;
      }

      const result = type === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        await onAvatarUpload?.(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert(
        'Error',
        'Failed to open image picker. Please try again.',
      );
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await onAvatarUpload?.(''); // Empty string to indicate removal
            } catch (error) {
              console.error('Error removing photo:', error);
              Alert.alert('Error', 'Failed to remove photo. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getFollowButtonProps = () => {
    switch (followStatus) {
      case 'follow':
        return {
          title: 'Follow',
          variant: 'primary' as const,
          icon: 'person-add' as keyof typeof MaterialIcons.glyphMap,
        };
      case 'following':
        return {
          title: 'Following',
          variant: 'secondary' as const,
          icon: 'person-remove' as keyof typeof MaterialIcons.glyphMap,
        };
      case 'friends':
        return {
          title: 'Friends',
          variant: 'success' as const,
          icon: 'people' as keyof typeof MaterialIcons.glyphMap,
        };
      case 'blocked':
        return {
          title: 'Blocked',
          variant: 'error' as const,
          icon: 'block' as keyof typeof MaterialIcons.glyphMap,
        };
      default:
        return null;
    }
  };

  const formatJoinDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `Joined ${format(date, 'MMMM yyyy')}`;
    } catch (error) {
      return 'Joined recently';
    }
  };

  const followButtonProps = getFollowButtonProps();

  return (
    <View style={styles.container}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity 
          onPress={handleAvatarPress}
          disabled={isUpdating}
          style={styles.avatarContainer}
          accessibilityRole="button"
          accessibilityLabel={isOwnProfile ? 'Change profile photo' : 'View profile photo'}
        >
          <Avatar
            source={user.avatar_url ? { uri: user.avatar_url } : undefined}
            name={user.display_name || user.username}
            size="xxl"
            style={[
              styles.avatar,
              isUpdating && styles.avatarUpdating,
            ]}
          />
          
          {isOwnProfile && (
            <View style={styles.cameraOverlay}>
              <MaterialIcons
                name="camera-alt"
                size={20}
                color={theme.colors.white}
              />
            </View>
          )}

          {isUpdating && (
            <View style={styles.updatingOverlay}>
              <MaterialIcons
                name="hourglass-empty"
                size={24}
                color={theme.colors.white}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* User Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.displayName}>
          {user.display_name || user.username}
        </Text>
        
        {user.display_name && (
          <Text style={styles.username}>
            @{user.username}
          </Text>
        )}

        {user.bio && (
          <Text style={styles.bio}>
            {user.bio}
          </Text>
        )}

        <Text style={styles.joinDate}>
          {formatJoinDate(user.created_at)}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {isOwnProfile ? (
          <Button
            title="Edit Profile"
            variant="secondary"
            size="md"
            onPress={onEditProfile}
            style={styles.actionButton}
            leftIcon={
              <MaterialIcons
                name="edit"
                size={18}
                color={theme.colors.primary}
              />
            }
          />
        ) : (
          followButtonProps && (
            <Button
              title={followButtonProps.title}
              variant={followButtonProps.variant}
              size="md"
              onPress={onFollowPress}
              style={styles.actionButton}
              leftIcon={
                <MaterialIcons
                  name={followButtonProps.icon}
                  size={18}
                  color={theme.colors.white}
                />
              }
            />
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  avatarSection: {
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
  },
  avatarUpdating: {
    opacity: 0.7,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
    ...theme.shadows.md,
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.full,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  displayName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  username: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  bio: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.md,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  joinDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    minWidth: SCREEN_WIDTH * 0.4,
  },
});

export default ProfileHeader;