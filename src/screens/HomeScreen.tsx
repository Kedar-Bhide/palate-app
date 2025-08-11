import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { HomeScreenProps } from '../navigation/types';
import { theme } from '../theme';
import uiTheme, { bottomNavHeight, spacing, colors, fonts } from '../theme/uiTheme';
import { useFeed } from '../hooks/useFeed';
import PostsList from '../components/posts/PostsList';
import { FeedAlgorithm } from '../lib/feedUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [algorithm, setAlgorithm] = useState<FeedAlgorithm>('recent');

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

  // Handle user press
  const handleUserPress = useCallback((userId: string) => {
    console.log('User pressed:', userId);
    // TODO: Navigate to user profile when stack navigator is set up
    // navigation.navigate('UserProfile', { userId });
  }, []);

  // Handle comment press
  const handleCommentPress = useCallback((postId: string) => {
    console.log('Comment pressed for post:', postId);
    // navigation.navigate('PostDetail', { postId });
  }, []);

  // Handle share press
  const handleSharePress = useCallback((postId: string) => {
    console.log('Share pressed for post:', postId);
    // Implement share functionality
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    console.log('Search pressed');
    // navigation.navigate('Search');
  }, []);

  // Handle notifications
  const handleNotifications = useCallback(() => {
    console.log('Notifications pressed');
    // navigation.navigate('Notifications');
  }, []);

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
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <MaterialIcons name="search" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <MaterialIcons name="notifications-none" size={24} color={theme.colors.text} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
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
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.feedContentContainer}
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

  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  badgeText: {
    color: colors.white,
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
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