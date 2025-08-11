import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Post } from '../../types';
import { theme } from '../../theme';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POST_GRID_SPACING = 4;
const POSTS_PER_ROW = 3;
const POST_SIZE = (SCREEN_WIDTH - (theme.spacing.lg * 2) - (POST_GRID_SPACING * (POSTS_PER_ROW - 1))) / POSTS_PER_ROW;

export interface ProfilePostsProps {
  posts: Post[];
  loading: boolean;
  onPostPress: (postId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyMessage?: string;
  showLoadMoreButton?: boolean;
  isOwnProfile?: boolean;
}

interface PostGridItemProps {
  post: Post;
  onPress: (postId: string) => void;
  size: number;
}

const PostGridItem: React.FC<PostGridItemProps> = ({ post, onPress, size }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handlePress = useCallback(() => {
    onPress(post.id);
  }, [post.id, onPress]);

  const renderOverlay = () => {
    const hasMultipleImages = post.image_urls.length > 1;
    const hasRating = post.rating && post.rating > 0;

    if (!hasMultipleImages && !hasRating) return null;

    return (
      <View style={styles.postOverlay}>
        {hasMultipleImages && (
          <View style={styles.overlayItem}>
            <MaterialIcons
              name="collections"
              size={16}
              color={theme.colors.white}
            />
            <Text style={styles.overlayText}>
              {post.image_urls.length}
            </Text>
          </View>
        )}
        
        {hasRating && (
          <View style={styles.overlayItem}>
            <MaterialIcons
              name="star"
              size={16}
              color={theme.colors.warning}
            />
            <Text style={styles.overlayText}>
              {post.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.postItem, { width: size, height: size }]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Post at ${post.restaurant_name}`}
    >
      <View style={styles.imageContainer}>
        {imageLoading && (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
        
        <Image
          source={{ uri: post.image_urls[0] }}
          style={styles.postImage}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          resizeMode="cover"
        />

        {imageError && (
          <View style={styles.errorContainer}>
            <MaterialIcons
              name="broken-image"
              size={24}
              color={theme.colors.textSecondary}
            />
          </View>
        )}

        {!imageLoading && !imageError && renderOverlay()}
      </View>
    </TouchableOpacity>
  );
};

export const ProfilePosts: React.FC<ProfilePostsProps> = ({
  posts,
  loading,
  onPostPress,
  onLoadMore,
  hasMore = false,
  emptyMessage,
  showLoadMoreButton = true,
  isOwnProfile = false,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      onLoadMore?.();
    }
  }, [hasMore, loading, onLoadMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh functionality would be handled by parent component
    // For now, just simulate a delay
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostGridItem
      post={item}
      onPress={onPostPress}
      size={POST_SIZE}
    />
  ), [onPostPress]);

  const renderLoadMoreButton = () => {
    if (!showLoadMoreButton || !hasMore || loading) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        accessibilityRole="button"
        accessibilityLabel="Load more posts"
      >
        <Text style={styles.loadMoreText}>
          Load More Posts
        </Text>
        <MaterialIcons
          name="expand-more"
          size={20}
          color={theme.colors.primary}
        />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Loading more posts...
          </Text>
        </View>
      )}
      
      {renderLoadMoreButton()}
      
      {!hasMore && posts.length > 0 && (
        <Text style={styles.endMessage}>
          You've seen all posts
        </Text>
      )}
    </View>
  );

  const renderEmptyState = () => {
    const message = emptyMessage || (
      isOwnProfile 
        ? "You haven't shared any food experiences yet"
        : "No posts shared yet"
    );

    const description = isOwnProfile
      ? "Start sharing your culinary adventures with friends!"
      : "Check back later for new posts.";

    return (
      <EmptyState
        icon="restaurant"
        title="No Posts Yet"
        description={description}
        actionText={isOwnProfile ? "Share Your First Post" : undefined}
        onActionPress={isOwnProfile ? () => {/* Navigate to camera */} : undefined}
      />
    );
  };

  if (posts.length === 0 && !loading) {
    return renderEmptyState();
  }

  return (
    <Card variant="flat" padding="medium" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name="grid-view"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.headerTitle}>
            Posts ({posts.length.toLocaleString()})
          </Text>
        </View>

        {posts.length > 0 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {/* Navigate to full posts view */}}
            accessibilityRole="button"
            accessibilityLabel="View all posts in grid"
          >
            <Text style={styles.viewAllText}>
              View All
            </Text>
            <MaterialIcons
              name="open-in-full"
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={POSTS_PER_ROW}
        columnWrapperStyle={POSTS_PER_ROW > 1 ? styles.row : undefined}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ItemSeparatorComponent={() => <View style={{ height: POST_GRID_SPACING }} />}
        scrollEnabled={false} // Disable internal scrolling since it's inside a larger scroll view
        nestedScrollEnabled={false}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}10`,
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginRight: theme.spacing.xs,
  },
  gridContainer: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  postItem: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray[100],
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[100],
    zIndex: 1,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[100],
  },
  postOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.xs,
  },
  overlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  overlayText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: 2,
  },
  footerContainer: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  loadMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginRight: theme.spacing.sm,
  },
  endMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});

export default ProfilePosts;