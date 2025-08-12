/**
 * PostInteractions Component
 * Enhanced post interaction component with advanced animations and features
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import { Post } from '../../types';

interface PostInteractionsProps {
  post: Post;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onReport: () => void;
  showCounts?: boolean;
  likeCount?: number;
  commentCount?: number;
  style?: any;
}

const PostInteractions: React.FC<PostInteractionsProps> = ({
  post,
  isLiked,
  isSaved,
  onLike,
  onComment,
  onShare,
  onSave,
  onReport,
  showCounts = true,
  likeCount = 0,
  commentCount = 0,
  style,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Animation values
  const likeScale = useSharedValue(1);
  const likeRotation = useSharedValue(0);
  const heartBurstScale = useSharedValue(0);
  const heartBurstOpacity = useSharedValue(0);
  const saveScale = useSharedValue(1);
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);

  // Heart burst particles
  const particleAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      scale: useSharedValue(0),
      translateX: useSharedValue(0),
      translateY: useSharedValue(0),
      opacity: useSharedValue(0),
    }))
  ).current;

  // Animated styles
  const likeButtonStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      likeScale.value,
      [1, 1.2],
      [isLiked ? colors.error : colors.text, colors.error]
    );

    return {
      transform: [
        { scale: likeScale.value },
        { rotate: `${likeRotation.value}deg` },
      ],
      color,
    };
  });

  const heartBurstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartBurstScale.value }],
    opacity: heartBurstOpacity.value,
  }));

  const saveButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const commentButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));

  const shareButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  // Particle animations
  const particleStyles = particleAnimations.map((particle) =>
    useAnimatedStyle(() => ({
      transform: [
        { scale: particle.scale.value },
        { translateX: particle.translateX.value },
        { translateY: particle.translateY.value },
      ],
      opacity: particle.opacity.value,
    }))
  );

  // Animation helpers
  const animateButton = useCallback((scaleValue: Animated.SharedValue<number>) => {
    'worklet';
    scaleValue.value = withSequence(
      withSpring(0.8, { duration: 100 }),
      withSpring(1, { duration: 200 })
    );
  }, []);

  const animateHeartBurst = useCallback(() => {
    'worklet';
    
    // Main heart burst
    heartBurstScale.value = withSequence(
      withTiming(1.5, { duration: 200 }),
      withTiming(0, { duration: 300 })
    );
    heartBurstOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 400 })
    );

    // Particle burst
    particleAnimations.forEach((particle, index) => {
      const angle = (index * 60) * (Math.PI / 180);
      const distance = 30;
      
      particle.scale.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 300 })
      );
      
      particle.translateX.value = withTiming(
        Math.cos(angle) * distance,
        { duration: 400 }
      );
      
      particle.translateY.value = withTiming(
        Math.sin(angle) * distance,
        { duration: 400 }
      );
      
      particle.opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 250 })
      );
    });
  }, []);

  const resetParticles = useCallback(() => {
    'worklet';
    particleAnimations.forEach((particle) => {
      particle.scale.value = 0;
      particle.translateX.value = 0;
      particle.translateY.value = 0;
      particle.opacity.value = 0;
    });
  }, []);

  // Interaction handlers
  const handleLike = useCallback(async () => {
    try {
      // Haptic feedback
      await Haptics.impactAsync(
        isLiked 
          ? Haptics.ImpactFeedbackStyle.Light 
          : Haptics.ImpactFeedbackStyle.Medium
      );

      // Heart animation
      likeScale.value = withSequence(
        withSpring(1.3, { duration: 150 }),
        withSpring(1, { duration: 200 })
      );

      if (!isLiked) {
        // Rotation animation for new likes
        likeRotation.value = withSequence(
          withTiming(15, { duration: 100 }),
          withTiming(-10, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );

        // Heart burst effect for new likes
        runOnJS(resetParticles)();
        animateHeartBurst();
      }

      // Call the like handler
      onLike();
      
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post. Please try again.');
    }
  }, [isLiked, onLike, animateHeartBurst, resetParticles]);

  const handleComment = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateButton(commentScale);
      onComment();
    } catch (error) {
      console.error('Error opening comments:', error);
    }
  }, [onComment, animateButton]);

  const handleShare = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateButton(shareScale);
      onShare();
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  }, [onShare, animateButton]);

  const handleSave = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      saveScale.value = withSequence(
        withSpring(1.2, { duration: 150 }),
        withSpring(1, { duration: 200 })
      );
      
      onSave();
    } catch (error) {
      console.error('Error saving post:', error);
    }
  }, [onSave]);

  // Long press gesture for context menu
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      runOnJS(setShowContextMenu)(true);
      runOnJS(showContextMenuAlert)();
    });

  const showContextMenuAlert = useCallback(() => {
    Alert.alert(
      'Post Actions',
      'Choose an action',
      [
        {
          text: 'Share',
          onPress: handleShare,
          style: 'default',
        },
        {
          text: 'Save',
          onPress: handleSave,
          style: 'default',
        },
        {
          text: 'Report',
          onPress: onReport,
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [handleShare, handleSave, onReport]);

  // Format count display
  const formatCount = useCallback((count: number): string => {
    if (count === 0) return '';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}m`;
  }, []);

  return (
    <GestureDetector gesture={longPressGesture}>
      <View style={[styles.container, style]}>
        <View style={styles.actionRow}>
          {/* Like Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <View style={styles.likeContainer}>
              <Animated.View style={[styles.iconContainer, likeButtonStyle]}>
                <MaterialIcons
                  name={isLiked ? 'favorite' : 'favorite-border'}
                  size={26}
                  color={isLiked ? colors.error : colors.text}
                />
              </Animated.View>
              
              {/* Heart Burst Effect */}
              <Animated.View style={[styles.heartBurst, heartBurstStyle]}>
                <MaterialIcons name="favorite" size={26} color={colors.error} />
              </Animated.View>

              {/* Heart Particles */}
              {particleStyles.map((style, index) => (
                <Animated.View key={index} style={[styles.heartParticle, style]}>
                  <MaterialIcons name="favorite" size={12} color={colors.error} />
                </Animated.View>
              ))}
            </View>
            
            {showCounts && likeCount > 0 && (
              <Text style={[styles.actionText, isLiked && styles.likedText]}>
                {formatCount(likeCount)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleComment}
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.iconContainer, commentButtonStyle]}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={26}
                color={colors.text}
              />
            </Animated.View>
            {showCounts && commentCount > 0 && (
              <Text style={styles.actionText}>
                {formatCount(commentCount)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.iconContainer, shareButtonStyle]}>
              <MaterialIcons
                name="share"
                size={26}
                color={colors.text}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Save Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.iconContainer, saveButtonStyle]}>
              <MaterialIcons
                name={isSaved ? 'bookmark' : 'bookmark-border'}
                size={26}
                color={isSaved ? colors.primary : colors.text}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Like Count Row */}
        {showCounts && likeCount > 0 && (
          <View style={styles.likesRow}>
            <Text style={styles.likesText}>
              {likeCount === 1 ? '1 like' : `${formatCount(likeCount)} likes`}
            </Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.white,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    minHeight: 44,
    paddingVertical: spacing(1),
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },

  likeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },

  heartBurst: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heartParticle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  likedText: {
    color: colors.error,
  },

  spacer: {
    flex: 1,
  },

  likesRow: {
    marginTop: spacing(1.5),
  },

  likesText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },
});

export default PostInteractions;