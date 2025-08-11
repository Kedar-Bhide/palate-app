/**
 * PostCard Component
 * Instagram-style post card component for the feed
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Post } from '../../types';
import { colors, spacing, fonts } from '../../theme/uiTheme';
import Avatar from '../ui/Avatar';
import PhotoCarousel from './PhotoCarousel';
import PostActions from './PostActions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onMenuPress?: (postId: string) => void;
  isLiked: boolean;
  likeCount: number;
  commentCount?: number;
  style?: any;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onUserPress,
  onMenuPress,
  isLiked,
  likeCount,
  commentCount = 0,
  style,
}) => {
  // Format timestamp
  const formattedTime = useMemo(() => {
    const postDate = new Date(post.created_at);
    const now = new Date();
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return postDate.toLocaleDateString();
  }, [post.created_at]);

  // Format location display
  const locationText = useMemo(() => {
    if (post.location_name) {
      return post.location_name;
    }
    return null;
  }, [post.location_name]);

  // Format dining type display
  const diningTypeText = useMemo(() => {
    const typeMap: Record<string, string> = {
      'fine_dining': 'Fine Dining',
      'casual': 'Casual Dining',
      'fast_food': 'Fast Food',
      'street_food': 'Street Food',
      'home_cooking': 'Home Cooking',
    };
    
    return post.dining_type ? typeMap[post.dining_type] || post.dining_type : null;
  }, [post.dining_type]);

  // Handle user press with haptic feedback
  const handleUserPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUserPress(post.user_id);
  }, [post.user_id, onUserPress]);

  // Handle menu press
  const handleMenuPress = useCallback(async () => {
    if (onMenuPress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onMenuPress(post.id);
    }
  }, [post.id, onMenuPress]);

  // Render rating stars
  const renderRating = () => {
    if (!post.rating) return null;
    
    return (
      <View style={styles.ratingContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <MaterialIcons
            key={index}
            name={index < post.rating! ? 'star' : 'star-border'}
            size={16}
            color={colors.warning}
          />
        ))}
        <Text style={styles.ratingText}>({post.rating}/5)</Text>
      </View>
    );
  };

  // Render cuisine tag
  const renderCuisineTag = () => {
    let cuisineName = 'Unknown';
    let emoji = '';
    
    if (typeof post.cuisine === 'string') {
      cuisineName = post.cuisine;
    } else if (post.cuisine && typeof post.cuisine === 'object') {
      cuisineName = post.cuisine.name || 'Unknown';
      emoji = post.cuisine.emoji || '';
    }
    
    return (
      <View style={styles.cuisineTag}>
        {emoji && <Text style={styles.cuisineEmoji}>{emoji}</Text>}
        <Text style={styles.cuisineText}>{cuisineName}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={handleUserPress}
          activeOpacity={0.7}
        >
          <Avatar
            size="md"
            name={post.user?.display_name || post.user?.username || 'User'}
            imageUrl={post.user?.avatar_url}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {post.user?.display_name || post.user?.username || 'Unknown User'}
            </Text>
            <Text style={styles.restaurantName}>{post.restaurant_name}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{formattedTime}</Text>
          {onMenuPress && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name="more-vert" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Photo Carousel */}
      <PhotoCarousel
        images={post.photo_urls}
        aspectRatio={1}
        showIndicators={true}
        enableZoom={true}
      />

      {/* Post Actions */}
      <PostActions
        postId={post.id}
        isLiked={isLiked}
        likeCount={likeCount}
        commentCount={commentCount}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        showSave={true}
      />

      {/* Post Content */}
      <View style={styles.content}>
        {/* Cuisine and Rating */}
        <View style={styles.contentHeader}>
          {renderCuisineTag()}
          {renderRating()}
        </View>

        {/* Review Text */}
        {post.review_text && (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewText} numberOfLines={3}>
              <Text style={styles.userName}>
                {post.user?.display_name || post.user?.username || 'User'}{' '}
              </Text>
              {post.review_text}
            </Text>
          </View>
        )}

        {/* Footer Info */}
        <View style={styles.footer}>
          {locationText && (
            <View style={styles.footerItem}>
              <MaterialIcons name="place" size={14} color={colors.textSecondary} />
              <Text style={styles.footerText}>{locationText}</Text>
            </View>
          )}
          
          {diningTypeText && (
            <View style={styles.footerItem}>
              <MaterialIcons name="restaurant" size={14} color={colors.textSecondary} />
              <Text style={styles.footerText}>{diningTypeText}</Text>
            </View>
          )}
          
          {post.is_private && (
            <View style={styles.footerItem}>
              <MaterialIcons name="lock" size={14} color={colors.textSecondary} />
              <Text style={styles.footerText}>Private</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginBottom: spacing(2),
    borderRadius: 0, // Instagram-style full-width cards
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userDetails: {
    marginLeft: spacing(2),
    flex: 1,
  },

  userName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    lineHeight: fonts.base * 1.2,
  },

  restaurantName: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    lineHeight: fonts.sm * 1.2,
    marginTop: 1,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  timestamp: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },

  menuButton: {
    padding: spacing(1),
    marginRight: -spacing(1),
  },

  // Content
  content: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
  },

  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },

  cuisineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: 16,
    gap: spacing(1),
  },

  cuisineEmoji: {
    fontSize: fonts.sm,
  },

  cuisineText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.primary,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  ratingText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    marginLeft: spacing(1),
  },

  reviewContainer: {
    marginBottom: spacing(2),
  },

  reviewText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.text,
    lineHeight: fonts.base * 1.4,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing(2),
  },

  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  footerText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
  },
});

export default PostCard;