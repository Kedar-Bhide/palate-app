/**
 * PostDetailScreen
 * Full-screen post detail view with enhanced features
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../theme/uiTheme';
import { Post } from '../types';
import { useFeed } from '../hooks/useFeed';
import PhotoCarousel from '../components/posts/PhotoCarousel';
import PostInteractions from '../components/posts/PostInteractions';
import ShareModal from '../components/posts/ShareModal';
import ReportModal from '../components/posts/ReportModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PostDetailRouteProp = RouteProp<{
  PostDetail: {
    postId: string;
    fromScreen?: 'feed' | 'profile' | 'search';
  };
}, 'PostDetail'>;

const PostDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { postId, fromScreen = 'feed' } = route.params;

  // State
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false); // Placeholder

  // Feed hook for interactions
  const feed = useFeed();

  // Load post details
  useEffect(() => {
    loadPostDetail();
  }, [postId]);

  const loadPostDetail = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try to find post in existing feed first
      const existingPost = feed.posts.find(p => p.id === postId);
      if (existingPost) {
        setPost(existingPost);
        setLoading(false);
        return;
      }

      // If not in feed, fetch from database
      const detailedPost = await feed.fetchPostDetail(postId);
      setPost(detailedPost);
    } catch (error) {
      console.error('Error loading post detail:', error);
      Alert.alert(
        'Error',
        'Failed to load post details. Please try again.',
        [
          { text: 'Try Again', onPress: loadPostDetail },
          { text: 'Go Back', onPress: handleGoBack, style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [postId, feed]);

  // Navigation handlers
  const handleGoBack = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleMenuPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'Post Options',
      undefined,
      [
        {
          text: 'Share',
          onPress: () => setShareModalVisible(true),
        },
        {
          text: 'Report',
          onPress: () => setReportModalVisible(true),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, []);

  // User interaction handlers
  const handleUserPress = useCallback(async (userId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Navigate to user profile:', userId);
    // TODO: Navigate to user profile
  }, []);

  const handleFollowPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFollowing(!isFollowing);
    // TODO: Implement follow/unfollow functionality
  }, [isFollowing]);

  // Post interaction handlers
  const handleLike = useCallback(async () => {
    if (!post) return;
    await feed.toggleLike(post.id);
  }, [post, feed]);

  const handleComment = useCallback(() => {
    if (!post) return;
    console.log('Open comments for post:', post.id);
    // TODO: Navigate to comments screen
  }, [post]);

  const handleShare = useCallback(() => {
    setShareModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!post) return;
    await feed.toggleSave(post.id);
  }, [post, feed]);

  const handleReport = useCallback(() => {
    setReportModalVisible(true);
  }, []);

  // Share modal handlers
  const handleShareComplete = useCallback((platform: string) => {
    console.log('Shared to:', platform);
    setShareModalVisible(false);
    
    // Track share analytics
    if (post) {
      feed.trackPostInteraction(post.id, 'share');
    }
  }, [post, feed]);

  // Report modal handlers
  const handleReportSubmitted = useCallback(() => {
    setReportModalVisible(false);
    Alert.alert(
      'Report Submitted',
      'Thank you for your report. We\'ll review this content and take appropriate action.',
      [{ text: 'OK' }]
    );
  }, []);

  // Location press handler
  const handleLocationPress = useCallback(async () => {
    if (!post?.location_name) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // TODO: Open map or location details
    console.log('Open location:', post.location_name);
  }, [post]);

  // Format timestamp
  const getFormattedTime = useCallback(() => {
    if (!post) return '';
    
    const postDate = new Date(post.created_at);
    return postDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [post]);

  // Get interaction state
  const getInteractionState = useCallback(() => {
    if (!post) return { isLiked: false, likeCount: 0, isSaved: false };
    
    const interaction = feed.getPostInteraction(post.id);
    return {
      ...interaction,
      isSaved: false, // TODO: Implement saved state
    };
  }, [post, feed]);

  // Render cuisine info
  const renderCuisineInfo = () => {
    if (!post) return null;

    let cuisineName = 'Unknown';
    let emoji = '';
    
    if (typeof post.cuisine === 'string') {
      cuisineName = post.cuisine;
    } else if (post.cuisine && typeof post.cuisine === 'object') {
      cuisineName = post.cuisine.name || 'Unknown';
      emoji = post.cuisine.emoji || '';
    }

    return (
      <View style={styles.cuisineContainer}>
        <View style={styles.cuisineTag}>
          {emoji && <Text style={styles.cuisineEmoji}>{emoji}</Text>}
          <Text style={styles.cuisineText}>{cuisineName}</Text>
        </View>
        
        {post.rating && (
          <View style={styles.ratingContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <MaterialIcons
                key={index}
                name={index < post.rating! ? 'star' : 'star-border'}
                size={20}
                color={colors.warning}
              />
            ))}
            <Text style={styles.ratingText}>({post.rating}/5)</Text>
          </View>
        )}
      </View>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerButton} />
        </View>
        
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" text="Loading post..." />
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerButton} />
        </View>
        
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Post Not Found</Text>
          <Text style={styles.errorText}>
            This post may have been deleted or is no longer available.
          </Text>
          <Button
            title="Go Back"
            onPress={handleGoBack}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { isLiked, likeCount, isSaved } = getInteractionState();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Photo Carousel */}
        <PhotoCarousel
          images={post.photo_urls}
          aspectRatio={1}
          showIndicators={true}
          enableZoom={true}
          style={styles.photoCarousel}
        />

        {/* User Section */}
        <View style={styles.userSection}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => handleUserPress(post.user_id)}
          >
            <Avatar
              size="lg"
              name={post.user?.display_name || post.user?.username || 'User'}
              imageUrl={post.user?.avatar_url}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {post.user?.display_name || post.user?.username || 'Unknown User'}
              </Text>
              <Text style={styles.restaurantName}>{post.restaurant_name}</Text>
              <Text style={styles.timestamp}>{getFormattedTime()}</Text>
            </View>
          </TouchableOpacity>
          
          {/* Follow Button (placeholder) */}
          <Button
            title={isFollowing ? 'Following' : 'Follow'}
            onPress={handleFollowPress}
            variant={isFollowing ? 'outlined' : 'filled'}
            size="sm"
          />
        </View>

        {/* Post Interactions */}
        <PostInteractions
          post={post}
          isLiked={isLiked}
          isSaved={isSaved}
          onLike={handleLike}
          onComment={handleComment}
          onShare={handleShare}
          onSave={handleSave}
          onReport={handleReport}
        />

        {/* Post Content */}
        <View style={styles.contentSection}>
          {/* Cuisine and Rating */}
          {renderCuisineInfo()}

          {/* Review Text */}
          {post.review_text && (
            <View style={styles.reviewContainer}>
              <Text style={styles.reviewText}>{post.review_text}</Text>
            </View>
          )}

          {/* Location */}
          {post.location_name && (
            <TouchableOpacity 
              style={styles.locationContainer}
              onPress={handleLocationPress}
            >
              <MaterialIcons name="place" size={20} color={colors.primary} />
              <Text style={styles.locationText}>{post.location_name}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Dining Type */}
          {post.dining_type && (
            <View style={styles.diningTypeContainer}>
              <MaterialIcons name="restaurant" size={20} color={colors.textSecondary} />
              <Text style={styles.diningTypeText}>
                {post.dining_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
          )}
        </View>

        {/* Comments Section Placeholder */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          <View style={styles.commentsPlaceholder}>
            <MaterialIcons name="chat-bubble-outline" size={48} color={colors.outline} />
            <Text style={styles.commentsPlaceholderText}>
              Comments coming soon!
            </Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: spacing(4) }} />
      </ScrollView>

      {/* Share Modal */}
      <ShareModal
        post={post}
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onShareComplete={handleShareComplete}
      />

      {/* Report Modal */}
      <ReportModal
        postId={post.id}
        userId={post.user_id}
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onReportSubmitted={handleReportSubmitted}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(6),
  },

  errorTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(2),
    textAlign: 'center',
  },

  errorText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(4),
  },

  errorButton: {
    minWidth: 120,
  },

  // Content
  scrollView: {
    flex: 1,
  },

  photoCarousel: {
    marginBottom: 0,
  },

  // User Section
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    backgroundColor: colors.white,
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userDetails: {
    marginLeft: spacing(3),
    flex: 1,
  },

  userName: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  restaurantName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.primary,
    marginBottom: spacing(0.5),
  },

  timestamp: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  // Content Section
  contentSection: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
  },

  cuisineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(3),
  },

  cuisineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: 20,
    gap: spacing(1),
  },

  cuisineEmoji: {
    fontSize: fonts.base,
  },

  cuisineText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  ratingText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    marginLeft: spacing(1),
  },

  reviewContainer: {
    marginBottom: spacing(3),
  },

  reviewText: {
    fontSize: fonts.base,
    color: colors.text,
    lineHeight: fonts.base * 1.5,
  },

  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2),
    marginBottom: spacing(2),
  },

  locationText: {
    fontSize: fonts.base,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
    flex: 1,
    marginLeft: spacing(2),
  },

  diningTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },

  diningTypeText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginLeft: spacing(2),
  },

  // Comments Section
  commentsSection: {
    backgroundColor: colors.white,
    marginTop: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(4),
  },

  commentsTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(3),
  },

  commentsPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing(6),
  },

  commentsPlaceholderText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    marginTop: spacing(2),
  },
});

export default PostDetailScreen;