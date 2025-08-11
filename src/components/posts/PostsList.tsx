/**
 * PostsList Component
 * Infinite scroll feed component with optimized performance
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Post } from '../../types';
import { colors, spacing, fonts } from '../../theme/uiTheme';
import PostCard from './PostCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import Card from '../ui/Card';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PostsListProps {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  interactions: { [postId: string]: { isLiked: boolean; likeCount: number; commentCount: number } };
  onRefresh: () => void;
  onLoadMore: () => void;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onPostPress?: (postId: string) => void;
  onRetry?: () => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
}

const PostsList: React.FC<PostsListProps> = ({
  posts,
  loading,
  refreshing,
  loadingMore,
  hasMore,
  error,
  interactions,
  onRefresh,
  onLoadMore,
  onLike,
  onComment,
  onShare,
  onUserPress,
  onPostPress,
  onRetry,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}) => {
  const insets = useSafeAreaInsets();

  // Memoized key extractor
  const keyExtractor = useCallback((item: Post) => item.id, []);

  // Memoized get item layout for performance
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_HEIGHT * 0.8, // Estimated item height
    offset: SCREEN_HEIGHT * 0.8 * index,
    index,
  }), []);

  // Handle end reached with throttling
  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !loading && !error) {
      onLoadMore();
    }
  }, [loadingMore, hasMore, loading, error, onLoadMore]);

  // Render post item with memoization
  const renderPost = useCallback(({ item: post }: { item: Post }) => {
    const interaction = interactions[post.id] || { 
      isLiked: false, 
      likeCount: 0, 
      commentCount: 0 
    };

    return (
      <PostCard
        post={post}
        isLiked={interaction.isLiked}
        likeCount={interaction.likeCount}
        commentCount={interaction.commentCount}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onUserPress={onUserPress}
        onMenuPress={onPostPress}
      />
    );
  }, [interactions, onLike, onComment, onShare, onUserPress, onPostPress]);

  // Render loading footer
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoadingText}>Loading more posts...</Text>
      </View>
    );
  }, [loadingMore]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (loading) return null;

    if (ListEmptyComponent) {
      return React.isValidElement(ListEmptyComponent) 
        ? ListEmptyComponent 
        : React.createElement(ListEmptyComponent);
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="restaurant" size={64} color={colors.outline} />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptyDescription}>
          Follow friends to see their delicious food adventures, or be the first to share yours!
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Text style={styles.emptyButtonText}>Refresh Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, ListEmptyComponent, onRefresh]);

  // Render error state
  const renderErrorState = useCallback(() => {
    if (!error) return null;

    return (
      <Card variant="outlined" padding="large" style={styles.errorCard}>
        <View style={styles.errorContent}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry || onRefresh}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={20} color={colors.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }, [error, onRetry, onRefresh]);

  // Render initial loading state
  if (loading && posts.length === 0) {
    return (
      <View style={styles.initialLoadingContainer}>
        <LoadingSpinner size="large" text="Loading your feed..." />
      </View>
    );
  }

  // Render error state if no posts and error exists
  if (error && posts.length === 0) {
    return (
      <View style={styles.errorContainer}>
        {renderErrorState()}
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={keyExtractor}
      // getItemLayout={getItemLayout} // Commented out as it can cause issues with variable heights
      
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={100}
      initialNumToRender={3}
      windowSize={10}
      
      // Pull to refresh
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          title="Pull to refresh"
          titleColor={colors.textSecondary}
        />
      }
      
      // Infinite scroll
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      
      // Components
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyState}
      
      // Styling
      style={styles.list}
      contentContainerStyle={[
        styles.contentContainer,
        posts.length === 0 && styles.emptyContentContainer,
        { paddingBottom: insets.bottom + spacing(2) },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      
      // Keyboard handling
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    flexGrow: 1,
  },

  emptyContentContainer: {
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT * 0.7,
  },

  initialLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
    backgroundColor: colors.background,
  },

  // Footer loading
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(3),
    gap: spacing(2),
  },

  footerLoadingText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(8),
  },

  emptyTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginTop: spacing(4),
    marginBottom: spacing(2),
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.5,
    marginBottom: spacing(6),
  },

  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(3),
    borderRadius: 25,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },

  // Error state
  errorCard: {
    marginHorizontal: spacing(3),
  },

  errorContent: {
    alignItems: 'center',
    paddingVertical: spacing(4),
  },

  errorTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginTop: spacing(3),
    marginBottom: spacing(2),
    textAlign: 'center',
  },

  errorMessage: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(4),
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    borderRadius: 20,
    gap: spacing(1.5),
    minHeight: 44,
  },

  retryButtonText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.white,
  },
});

export default React.memo(PostsList);