import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { HomeScreenProps } from '../navigation/types';
import { theme } from '../theme';
import uiTheme, { bottomNavHeight, spacing, colors, fonts } from '../theme/uiTheme';
import { useFeed } from '../hooks/useFeed';
import PostsList from '../components/posts/PostsList';
import FeedFilter from '../components/feed/FeedFilter';
import EmptyFeedState from '../components/feed/EmptyFeedState';
import { FeedAlgorithm, FeedFilters } from '../lib/feedUtils';
import { createTestPost, createSamplePosts } from '../lib/sampleData';
import { getCurrentUser } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [algorithm, setAlgorithm] = useState<FeedAlgorithm>('recent');
  const [filters, setFilters] = useState<FeedFilters>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Feed hook
  const feed = useFeed({ 
    algorithm,
    pageSize: 10,
    enableRealtime: true,
    enableCache: true,
  });

  // Handle algorithm change
  const handleAlgorithmChange = useCallback((newAlgorithm: FeedAlgorithm) => {
    setAlgorithm(newAlgorithm);
    feed.changeAlgorithm(newAlgorithm);
  }, [feed]);

  // Handle filters change
  const handleFiltersChange = useCallback(async (newFilters: FeedFilters) => {
    setFilters(newFilters);
    await feed.applyFeedFilters(newFilters);
  }, [feed]);

  // Handle filter modal
  const handleFilterPress = useCallback(() => {
    setFilterModalVisible(true);
  }, []);

  const handleFilterClose = useCallback(() => {
    setFilterModalVisible(false);
  }, []);

  const handleFilterReset = useCallback(async () => {
    const resetFilters = {};
    setFilters(resetFilters);
    setAlgorithm('recent');
    await feed.applyFeedFilters(resetFilters);
    feed.changeAlgorithm('recent');
    setFilterModalVisible(false);
  }, [feed]);

  // Handle user press
  const handleUserPress = useCallback((userId: string) => {
    console.log('User pressed:', userId);
    (navigation as any).navigate('UserProfile', { userId });
  }, [navigation]);

  // Handle post press (navigate to detail)
  const handlePostPress = useCallback((postId: string) => {
    console.log('Navigate to post detail:', postId);
    (navigation as any).navigate('PostDetail', { postId, fromScreen: 'feed' });
  }, [navigation]);

  // Handle comment press
  const handleCommentPress = useCallback((postId: string) => {
    console.log('Comment pressed for post:', postId);
    // For now, navigate to post detail where comments will be
    handlePostPress(postId);
  }, [handlePostPress]);

  // Handle share press
  const handleSharePress = useCallback((postId: string) => {
    console.log('Share pressed for post:', postId);
    feed.trackPostInteraction(postId, 'share');
  }, [feed]);

  // Handle search
  const handleSearch = useCallback(() => {
    console.log('Search pressed');
    // navigation.navigate('Search');
  }, []);

  // Handle create test data
  const handleCreateTestData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      const success = await createTestPost(user.id);
      if (success) {
        console.log('Test post created, refreshing feed...');
        await feed.refreshFeed();
      }
    } catch (error) {
      console.error('Error creating test data:', error);
    }
  }, [feed]);

  // Handle create sample posts
  const handleCreateSamplePosts = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      const success = await createSamplePosts(user.id);
      if (success) {
        console.log('Sample posts created, refreshing feed...');
        await feed.refreshFeed();
      }
    } catch (error) {
      console.error('Error creating sample posts:', error);
    }
  }, [feed]);


  // Handle quick post
  const handleQuickPost = useCallback(() => {
    navigation.navigate('Camera');
  }, [navigation]);

  // Render header component
  const renderHeader = () => (
    <View>
      {/* Algorithm Toggle */}
      <View style={styles.algorithmSection}>
        <View style={styles.algorithmToggle}>
          <TouchableOpacity
            style={[
              styles.algorithmButton,
              algorithm === 'recent' && styles.algorithmButtonActive,
            ]}
            onPress={() => handleAlgorithmChange('recent')}
          >
            <Text
              style={[
                styles.algorithmButtonText,
                algorithm === 'recent' && styles.algorithmButtonTextActive,
              ]}
            >
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.algorithmButton,
              algorithm === 'popular' && styles.algorithmButtonActive,
            ]}
            onPress={() => handleAlgorithmChange('popular')}
          >
            <Text
              style={[
                styles.algorithmButtonText,
                algorithm === 'popular' && styles.algorithmButtonTextActive,
              ]}
            >
              Popular
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Palate</Text>
        <View style={styles.headerActions}>
          {/* Test Data Button (for development) */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={handleCreateTestData}
              style={[styles.headerButton, { backgroundColor: colors.success }]}
              accessibilityRole="button"
              accessibilityLabel="Create test post"
            >
              <MaterialIcons name="add" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleFilterPress}
            style={[styles.headerButton, styles.filterButton]}
            accessibilityRole="button"
            accessibilityLabel="Filter posts"
          >
            <MaterialIcons name="tune" size={24} color={theme.colors.text} />
            {(filters.cuisines?.length || filters.diningTypes?.length || filters.ratings?.length || algorithm !== 'recent') && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <MaterialIcons name="search" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      <PostsList
        posts={feed.posts}
        loading={feed.loading}
        refreshing={feed.refreshing}
        loadingMore={feed.loadingMore}
        hasMore={feed.hasMore}
        error={feed.error}
        interactions={feed.interactions}
        onRefresh={feed.refreshFeed}
        onLoadMore={feed.loadMorePosts}
        onLike={feed.toggleLike}
        onComment={handleCommentPress}
        onShare={handleSharePress}
        onUserPress={handleUserPress}
        onPostPress={handlePostPress}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !feed.loading && feed.posts.length === 0 ? (
            <EmptyFeedState
              type={feed.error ? 'error' : 'new-user'}
              onActionPress={() => {
                if (feed.error) {
                  feed.refreshFeed();
                } else {
                  console.log('Find friends pressed');
                }
              }}
              onSecondaryActionPress={() => {
                handleQuickPost();
              }}
            />
          ) : null
        }
        contentContainerStyle={[
          styles.feedContentContainer,
          feed.posts.length === 0 && styles.emptyFeedContainer,
        ]}
      />

      {/* Feed Filter Modal */}
      <FeedFilter
        visible={filterModalVisible}
        activeFilters={filters}
        currentAlgorithm={algorithm}
        onFiltersChange={handleFiltersChange}
        onAlgorithmChange={handleAlgorithmChange}
        onClose={handleFilterClose}
        onReset={handleFilterReset}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleQuickPost}
        accessibilityRole="button"
        accessibilityLabel="Quick post"
        accessibilityHint="Tap to quickly share a food moment"
      >
        <MaterialIcons name="add" size={28} color={theme.colors.white} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  headerTitle: {
    fontSize: SCREEN_WIDTH > 375 ? fonts.xxxl : fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },

  headerButton: {
    padding: spacing(2),
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },


  // Algorithm Section
  algorithmSection: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },

  algorithmToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 25,
    padding: spacing(0.5),
  },

  algorithmButton: {
    flex: 1,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  algorithmButtonActive: {
    backgroundColor: colors.primary,
  },

  algorithmButtonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  algorithmButtonTextActive: {
    color: colors.white,
    fontWeight: fonts.weights.semibold,
  },

  // Feed
  feedContentContainer: {
    paddingBottom: bottomNavHeight + spacing(4),
  },

  emptyFeedContainer: {
    flexGrow: 1,
  },

  filterButton: {
    position: 'relative',
  },

  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: bottomNavHeight + spacing(3),
    right: spacing(3),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default HomeScreen;