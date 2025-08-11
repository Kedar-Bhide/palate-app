/**
 * PostActions Component
 * Post interaction buttons with animations and haptic feedback
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Share,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';

interface PostActionsProps {
  postId: string;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onSave?: (postId: string) => void;
  showSave?: boolean;
  disabled?: boolean;
}

const PostActions: React.FC<PostActionsProps> = ({
  postId,
  isLiked,
  likeCount,
  commentCount,
  onLike,
  onComment,
  onShare,
  onSave,
  showSave = false,
  disabled = false,
}) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Animation values
  const likeScale = useSharedValue(1);
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const saveScale = useSharedValue(1);

  // Animated styles
  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const commentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));

  const shareAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  // Animation helper
  const animateButton = useCallback((scaleValue: Animated.SharedValue<number>) => {
    'worklet';
    scaleValue.value = withSequence(
      withSpring(0.8, { duration: 100 }),
      withSpring(1, { duration: 200 })
    );
  }, []);

  // Like handler with animation
  const handleLike = useCallback(async () => {
    if (disabled || isLiking) return;

    try {
      setIsLiking(true);
      
      // Animate button
      animateButton(likeScale);
      
      // Haptic feedback
      await Haptics.impactAsync(
        isLiked 
          ? Haptics.ImpactFeedbackStyle.Light 
          : Haptics.ImpactFeedbackStyle.Medium
      );
      
      // Call the like handler
      onLike(postId);
      
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post. Please try again.');
    } finally {
      setIsLiking(false);
    }
  }, [disabled, isLiking, isLiked, postId, onLike, animateButton, likeScale]);

  // Comment handler
  const handleComment = useCallback(async () => {
    if (disabled) return;

    try {
      animateButton(commentScale);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onComment(postId);
    } catch (error) {
      console.error('Error opening comments:', error);
    }
  }, [disabled, postId, onComment, animateButton, commentScale]);

  // Share handler with native share
  const handleShare = useCallback(async () => {
    if (disabled) return;

    try {
      animateButton(shareScale);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Call the share handler
      onShare(postId);
      
      // You can also implement native sharing here
      // const result = await Share.share({
      //   message: 'Check out this amazing food post from Palate!',
      //   url: `palate://post/${postId}`,
      // });
      
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  }, [disabled, postId, onShare, animateButton, shareScale]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (disabled || !onSave) return;

    try {
      animateButton(saveScale);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setIsSaved(!isSaved);
      onSave(postId);
      
    } catch (error) {
      console.error('Error saving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    }
  }, [disabled, isSaved, postId, onSave, animateButton, saveScale]);

  // Format count display
  const formatCount = useCallback((count: number): string => {
    if (count === 0) return '';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}m`;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        {/* Like Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
          disabled={disabled || isLiking}
          activeOpacity={0.7}
        >
          <Animated.View style={[styles.iconContainer, likeAnimatedStyle]}>
            <MaterialIcons
              name={isLiked ? 'favorite' : 'favorite-border'}
              size={24}
              color={isLiked ? colors.error : colors.text}
            />
          </Animated.View>
          {likeCount > 0 && (
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {formatCount(likeCount)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleComment}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Animated.View style={[styles.iconContainer, commentAnimatedStyle]}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={24}
              color={colors.text}
            />
          </Animated.View>
          {commentCount > 0 && (
            <Text style={styles.actionText}>
              {formatCount(commentCount)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Animated.View style={[styles.iconContainer, shareAnimatedStyle]}>
            <MaterialIcons
              name="share"
              size={24}
              color={colors.text}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Save Button (optional) */}
        {showSave && onSave && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSave}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.iconContainer, saveAnimatedStyle]}>
              <MaterialIcons
                name={isSaved ? 'bookmark' : 'bookmark-border'}
                size={24}
                color={isSaved ? colors.primary : colors.text}
              />
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* Like count text (if likes exist) */}
      {likeCount > 0 && (
        <View style={styles.likesRow}>
          <Text style={styles.likesText}>
            {likeCount === 1 ? '1 like' : `${formatCount(likeCount)} likes`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    minHeight: 44, // Ensure proper touch target
    paddingVertical: spacing(1),
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  likedText: {
    color: colors.error,
  },

  spacer: {
    flex: 1,
  },

  likesRow: {
    marginTop: spacing(1),
  },

  likesText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },
});

export default PostActions;