import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../hooks/useFriends';
import { Input } from '../components/ui/Input';
import UserCard from '../components/friends/UserCard';
import { User, FriendAction, FriendCategory } from '../types/friends';
import { formatUserActivity } from '../lib/friendsUtils';
import { colors, spacing, radii, fonts, shadows } from '../theme/uiTheme';

type SortType = 'name' | 'recent_activity' | 'friend_since';
type CategoryType = 'all' | 'recent' | 'close' | 'suggested';

export default function FriendsListScreen() {
  const navigation = useNavigation();
  const {
    friends,
    suggestedUsers,
    loading,
    sendFriendRequest,
    removeFriend,
    blockUser,
    refreshData,
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [refreshing, setRefreshing] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing friends:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('UserProfile' as never, { userId } as never);
  }, [navigation]);

  const handleFriendAction = useCallback(async (userId: string, action: FriendAction) => {
    try {
      switch (action) {
        case 'add_friend':
          await sendFriendRequest(userId);
          Alert.alert('Success', 'Friend request sent!');
          break;
        case 'remove_friend':
          await removeFriend(userId);
          Alert.alert('Success', 'Friend removed.');
          break;
        case 'block_user':
          await blockUser(userId);
          Alert.alert('Success', 'User blocked.');
          break;
      }
    } catch (error) {
      console.error('Friend action error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [sendFriendRequest, removeFriend, blockUser]);

  const filteredAndSortedFriends = useMemo(() => {
    let result = [...friends];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(friend => 
        friend.display_name.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory === 'recent') {
      // Show friends with recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      result = result.filter(friend => 
        new Date(friend.updated_at) > sevenDaysAgo
      );
    }
    // Note: 'close' and other categories would require additional data from backend

    // Sort friends
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.display_name.localeCompare(b.display_name);
        case 'recent_activity':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'friend_since':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [friends, searchQuery, activeCategory, sortBy]);

  const friendCategories: FriendCategory[] = useMemo(() => [
    {
      id: 'all',
      name: 'All Friends',
      friends: friends,
      count: friends.length,
      icon: 'people',
    },
    {
      id: 'recent',
      name: 'Recent Activity',
      friends: friends.filter(friend => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(friend.updated_at) > sevenDaysAgo;
      }),
      count: friends.filter(friend => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(friend.updated_at) > sevenDaysAgo;
      }).length,
      icon: 'time',
    },
    {
      id: 'suggested',
      name: 'Suggested',
      friends: suggestedUsers.map(s => s.user),
      count: suggestedUsers.length,
      icon: 'bulb',
    },
  ], [friends, suggestedUsers]);

  const activeData = useMemo(() => {
    if (activeCategory === 'suggested') {
      return suggestedUsers.map(s => s.user);
    }
    return filteredAndSortedFriends;
  }, [activeCategory, filteredAndSortedFriends, suggestedUsers]);

  const renderSortMenu = () => {
    if (!showSortMenu) return null;

    const sortOptions = [
      { key: 'name', label: 'Name (A-Z)', icon: 'text' },
      { key: 'recent_activity', label: 'Recent Activity', icon: 'time' },
      { key: 'friend_since', label: 'Friend Since', icon: 'calendar' },
    ];

    return (
      <View style={styles.sortMenu}>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortOption,
              sortBy === option.key && styles.sortOptionActive,
            ]}
            onPress={() => {
              setSortBy(option.key as SortType);
              setShowSortMenu(false);
            }}
          >
            <Ionicons 
              name={option.icon as any} 
              size={20} 
              color={sortBy === option.key ? colors.primary : colors.textSecondary} 
            />
            <Text
              style={[
                styles.sortOptionText,
                sortBy === option.key && styles.sortOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.key && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCategoryTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryScrollContent}
    >
      {friendCategories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryTab,
            activeCategory === category.id && styles.categoryTabActive,
          ]}
          onPress={() => setActiveCategory(category.id as CategoryType)}
        >
          <Ionicons
            name={category.icon as any}
            size={20}
            color={activeCategory === category.id ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.categoryTabText,
              activeCategory === category.id && styles.categoryTabTextActive,
            ]}
          >
            {category.name}
          </Text>
          <View
            style={[
              styles.categoryBadge,
              activeCategory === category.id && styles.categoryBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.categoryBadgeText,
                activeCategory === category.id && styles.categoryBadgeTextActive,
              ]}
            >
              {category.count}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSearchAndSort = () => (
    <View style={styles.searchContainer}>
      <Input
        variant="outlined"
        placeholder="Search friends..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon={
          <Ionicons 
            name="search" 
            size={20} 
            color={colors.textSecondary} 
          />
        }
        rightIcon={
          searchQuery ? (
            <Ionicons 
              name="close-circle" 
              size={20} 
              color={colors.textSecondary} 
            />
          ) : undefined
        }
        onRightIconPress={searchQuery ? () => setSearchQuery('') : undefined}
        style={styles.searchInput}
      />

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortMenu(!showSortMenu)}
      >
        <Ionicons name="funnel" size={20} color={colors.primary} />
        <Text style={styles.sortButtonText}>Sort</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriendStats = () => {
    const totalFriends = friends.length;
    const recentActivity = friendCategories.find(c => c.id === 'recent')?.count || 0;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalFriends}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{recentActivity}</Text>
          <Text style={styles.statLabel}>Active This Week</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{suggestedUsers.length}</Text>
          <Text style={styles.statLabel}>Suggestions</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    const currentCategory = friendCategories.find(c => c.id === activeCategory);
    const isEmpty = activeData.length === 0;

    if (!isEmpty) return null;

    let emoji = '👥';
    let title = 'No friends yet';
    let message = 'Start connecting with other food lovers!';

    if (activeCategory === 'recent') {
      emoji = '📱';
      title = 'No recent activity';
      message = 'Your friends haven\'t been active recently.';
    } else if (activeCategory === 'suggested') {
      emoji = '💡';
      title = 'No suggestions';
      message = 'We\'ll suggest friends based on your activity.';
    } else if (searchQuery) {
      emoji = '🔍';
      title = 'No results found';
      message = `No friends match "${searchQuery}".`;
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateEmoji}>{emoji}</Text>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateMessage}>{message}</Text>
        
        {activeCategory === 'all' && !searchQuery && (
          <TouchableOpacity
            style={styles.findFriendsButton}
            onPress={() => navigation.navigate('FriendSearch' as never)}
          >
            <Ionicons name="search" size={20} color={colors.white} />
            <Text style={styles.findFriendsButtonText}>Find Friends</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFriendsList = () => {
    if (loading && friends.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      );
    }

    return (
      <View style={styles.friendsList}>
        {activeData.map((friend: User) => (
          <UserCard
            key={friend.id}
            user={friend}
            currentUserId="" // Filled by hook
            friendshipStatus={activeCategory === 'suggested' ? 'none' : 'friends'}
            onPress={handleUserPress}
            onFriendAction={handleFriendAction}
            showActivity
            size="medium"
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Friends</Text>
          <Text style={styles.headerSubtitle}>
            {friends.length} friend{friends.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('FriendSearch' as never)}
        >
          <Ionicons name="person-add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Friend Stats */}
      {renderFriendStats()}

      {/* Category Tabs */}
      <View style={styles.categoryContainer}>
        {renderCategoryTabs()}
      </View>

      {/* Search and Sort */}
      {renderSearchAndSort()}

      {/* Sort Menu */}
      {renderSortMenu()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderEmptyState()}
        {renderFriendsList()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  backButton: {
    marginRight: spacing(1.5),
    padding: spacing(0.5),
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  addButton: {
    padding: spacing(0.5),
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginBottom: spacing(0.25),
  },

  statLabel: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  categoryContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  categoryScrollContent: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },

  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    marginRight: spacing(1),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceVariant,
    gap: spacing(0.5),
  },

  categoryTabActive: {
    backgroundColor: colors.primaryLight,
  },

  categoryTabText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  categoryTabTextActive: {
    color: colors.primary,
  },

  categoryBadge: {
    backgroundColor: colors.white,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(0.5),
  },

  categoryBadgeActive: {
    backgroundColor: colors.primary,
  },

  categoryBadgeText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.textSecondary,
  },

  categoryBadgeTextActive: {
    color: colors.white,
  },

  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
    gap: spacing(1),
  },

  searchInput: {
    flex: 1,
    marginBottom: 0,
  },

  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    gap: spacing(0.5),
  },

  sortButtonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.primary,
  },

  sortMenu: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginTop: spacing(1),
    borderRadius: radii.lg,
    paddingVertical: spacing(1),
    ...shadows.medium,
  },

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    gap: spacing(1.5),
  },

  sortOptionActive: {
    backgroundColor: colors.primaryLight,
  },

  sortOptionText: {
    flex: 1,
    fontSize: fonts.base,
    color: colors.textSecondary,
  },

  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  loadingContainer: {
    paddingVertical: spacing(4),
    alignItems: 'center',
  },

  loadingText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
  },

  emptyState: {
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
  },

  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },

  emptyStateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(3),
  },

  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
    borderRadius: radii.lg,
    gap: spacing(0.75),
  },

  findFriendsButtonText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
  },

  friendsList: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing(2),
  },
});