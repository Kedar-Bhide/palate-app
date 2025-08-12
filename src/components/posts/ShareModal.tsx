/**
 * ShareModal Component
 * Native sharing functionality with multiple share options
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TouchableOpacity,
  Share,
  Clipboard,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import { Post } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShareModalProps {
  post: Post;
  visible: boolean;
  onClose: () => void;
  onShareComplete: (platform: string) => void;
}

interface ShareOption {
  id: string;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  action: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  post,
  visible,
  onClose,
  onShareComplete,
}) => {
  const [sharing, setSharing] = useState<string | null>(null);

  // Generate share content
  const generateShareContent = useCallback(() => {
    const userName = post.user?.display_name || post.user?.username || 'Someone';
    let cuisineName = 'food';
    
    if (typeof post.cuisine === 'string') {
      cuisineName = post.cuisine;
    } else if (post.cuisine && typeof post.cuisine === 'object') {
      cuisineName = post.cuisine.name || 'food';
    }

    const rating = post.rating ? ` (${post.rating}/5 ⭐)` : '';
    const location = post.location_name ? ` at ${post.location_name}` : '';
    
    return {
      title: `${userName} shared a ${cuisineName} experience`,
      message: `Check out this ${cuisineName} post${rating}${location}!\n\n"${post.review_text || `Great ${cuisineName} at ${post.restaurant_name}!`}"\n\nShared from Palate Food App`,
      url: `https://palate.app/post/${post.id}`, // Deep link URL
    };
  }, [post]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    try {
      setSharing('native');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const shareContent = generateShareContent();
      
      const result = await Share.share({
        title: shareContent.title,
        message: shareContent.message,
        url: shareContent.url,
      });

      if (result.action === Share.sharedAction) {
        onShareComplete('native');
        onClose();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setSharing(null);
    }
  }, [post, generateShareContent, onShareComplete, onClose]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    try {
      setSharing('copy');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const shareContent = generateShareContent();
      await Clipboard.setString(shareContent.url);
      
      Alert.alert(
        'Link Copied!',
        'Post link has been copied to your clipboard.',
        [{ text: 'OK' }]
      );
      
      onShareComplete('copy');
      onClose();
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link. Please try again.');
    } finally {
      setSharing(null);
    }
  }, [generateShareContent, onShareComplete, onClose]);

  // Handle share as text
  const handleShareAsText = useCallback(async () => {
    try {
      setSharing('text');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userName = post.user?.display_name || post.user?.username || 'Someone';
      let cuisineName = 'food';
      
      if (typeof post.cuisine === 'string') {
        cuisineName = post.cuisine;
      } else if (post.cuisine && typeof post.cuisine === 'object') {
        cuisineName = post.cuisine.name || 'food';
      }

      const rating = post.rating ? `\n⭐ Rating: ${post.rating}/5` : '';
      const location = post.location_name ? `\n📍 ${post.location_name}` : '';
      const review = post.review_text ? `\n💭 "${post.review_text}"` : '';
      
      const textContent = `🍽️ ${cuisineName} at ${post.restaurant_name}${rating}${location}${review}\n\n👤 Shared by ${userName} on Palate`;

      const result = await Share.share({
        message: textContent,
      });

      if (result.action === Share.sharedAction) {
        onShareComplete('text');
        onClose();
      }
    } catch (error) {
      console.error('Error sharing as text:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setSharing(null);
    }
  }, [post, onShareComplete, onClose]);

  // Handle share to Instagram Stories (placeholder)
  const handleShareToInstagram = useCallback(async () => {
    try {
      setSharing('instagram');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // This would require Instagram integration
      Alert.alert(
        'Coming Soon',
        'Instagram Stories sharing will be available in a future update!',
        [{ text: 'OK' }]
      );
      
      onShareComplete('instagram');
    } catch (error) {
      console.error('Error sharing to Instagram:', error);
    } finally {
      setSharing(null);
    }
  }, [onShareComplete]);

  // Handle close modal
  const handleClose = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  // Share options
  const shareOptions: ShareOption[] = [
    {
      id: 'native',
      title: 'Share',
      icon: 'share',
      color: colors.primary,
      action: handleNativeShare,
    },
    {
      id: 'copy',
      title: 'Copy Link',
      icon: 'content-copy',
      color: colors.info,
      action: handleCopyLink,
    },
    {
      id: 'text',
      title: 'Share as Text',
      icon: 'text-fields',
      color: colors.success,
      action: handleShareAsText,
    },
    {
      id: 'instagram',
      title: 'Instagram Stories',
      icon: 'camera-alt',
      color: '#E4405F', // Instagram brand color
      action: handleShareToInstagram,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <Text style={styles.headerTitle}>Share Post</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Post Preview */}
          <View style={styles.postPreview}>
            <View style={styles.postInfo}>
              <Text style={styles.restaurantName}>{post.restaurant_name}</Text>
              <Text style={styles.cuisineText}>
                {typeof post.cuisine === 'string' 
                  ? post.cuisine 
                  : post.cuisine?.name || 'Food'}
                {post.rating && ` • ${post.rating}/5 ⭐`}
              </Text>
              {post.location_name && (
                <Text style={styles.locationText}>📍 {post.location_name}</Text>
              )}
            </View>
          </View>

          {/* Share Options */}
          <ScrollView 
            style={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.optionsGrid}>
              {shareOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.optionButton}
                  onPress={option.action}
                  disabled={sharing === option.id}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIcon, { backgroundColor: `${option.color}15` }]}>
                    <MaterialIcons 
                      name={option.icon} 
                      size={28} 
                      color={option.color} 
                    />
                  </View>
                  <Text style={styles.optionText}>{option.title}</Text>
                  {sharing === option.id && (
                    <View style={styles.loadingIndicator}>
                      <Text style={styles.loadingText}>...</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Additional Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                Share this delicious food post with your friends and help them discover great restaurants!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  backdrop: {
    flex: 1,
  },

  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    position: 'relative',
  },

  dragHandle: {
    position: 'absolute',
    top: spacing(1),
    left: '50%',
    marginLeft: -spacing(3),
    width: spacing(6),
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: 2,
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postPreview: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: colors.surfaceVariant,
  },

  postInfo: {
    alignItems: 'center',
  },

  restaurantName: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  cuisineText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginBottom: spacing(0.5),
  },

  locationText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  optionsContainer: {
    flex: 1,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing(3),
  },

  optionButton: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - spacing(8) - spacing(3)) / 2,
    paddingVertical: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: 16,
    position: 'relative',
  },

  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },

  optionText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },

  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -10,
    marginLeft: -10,
  },

  loadingText: {
    fontSize: fonts.lg,
    color: colors.primary,
    fontWeight: fonts.weights.bold,
  },

  infoSection: {
    marginTop: spacing(4),
    marginBottom: spacing(4),
    paddingTop: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },

  infoText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.4,
    fontStyle: 'italic',
  },
});

export default ShareModal;