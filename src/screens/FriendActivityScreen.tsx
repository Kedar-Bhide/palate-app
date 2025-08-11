import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getCurrentUser } from '../lib/supabase';
import { useFriends } from '../hooks/useFriends';
import FriendActivityFeed from '../components/friends/FriendActivityFeed';
import { FriendActivity, User } from '../types/friends';
import { colors, spacing, radii, fonts, shadows } from '../theme/uiTheme';

type ActivityFilter = 'all' | 'post_created' | 'cuisine_tried' | 'achievement_unlocked' | 'friend_joined' | 'milestone_reached';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

export default function FriendActivityScreen() {
  const navigation = useNavigation();
  const { friends, refreshData } = useFriends();

  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadActivities = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // Get friend IDs
      const friendIds = friends.map(friend => friend.id);
      if (friendIds.length === 0) {
        setActivities([]);
        return;
      }

      // Calculate time filter
      let timeThreshold = new Date();
      switch (timeFilter) {
        case 'today':
          timeThreshold.setHours(0, 0, 0, 0);
          break;
        case 'week':
          timeThreshold.setDate(timeThreshold.getDate() - 7);
          break;
        case 'month':
          timeThreshold.setMonth(timeThreshold.getMonth() - 1);
          break;
        default:
          timeThreshold.setFullYear(timeThreshold.getFullYear() - 1); // Last year for 'all'
      }

      let query = supabase
        .from('friend_activities')
        .select(`
          *,
          user:user_id(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .in('user_id', friendIds)
        .gte('created_at', timeThreshold.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply activity type filter
      if (activeFilter !== 'all') {
        query = query.eq('type', activeFilter);
      }

      const { data: activitiesData, error } = await query;

      if (error) throw error;

      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivities([]);
    }
  }, [friends, activeFilter, timeFilter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshData(), loadActivities()]);
    } catch (error) {
      console.error('Error refreshing activities:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, loadActivities]);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('UserProfile' as never, { userId } as never);
  }, [navigation]);

  const handleActivityPress = useCallback((activity: FriendActivity) => {
    if (activity.metadata?.post_id) {
      navigation.navigate('PostDetail' as never, { postId: activity.metadata.post_id } as never);
    } else if (activity.type === 'friend_joined') {
      handleUserPress(activity.user_id);
    }
  }, [navigation, handleUserPress]);

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.user.display_name.toLowerCase().includes(query) ||
        activity.user.username.toLowerCase().includes(query) ||
        activity.title.toLowerCase().includes(query) ||
        activity.description.toLowerCase().includes(query) ||
        activity.metadata?.cuisine_name?.toLowerCase().includes(query) ||
        activity.metadata?.achievement_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities, searchQuery]);

  const activityFilters = useMemo(() => [
    { id: 'all', label: 'All Activity', icon: 'pulse', count: activities.length },
    { id: 'post_created', label: 'New Posts', icon: 'camera', count: activities.filter(a => a.type === 'post_created').length },
    { id: 'cuisine_tried', label: 'New Cuisines', icon: 'restaurant', count: activities.filter(a => a.type === 'cuisine_tried').length },
    { id: 'achievement_unlocked', label: 'Achievements', icon: 'trophy', count: activities.filter(a => a.type === 'achievement_unlocked').length },
    { id: 'milestone_reached', label: 'Milestones', icon: 'ribbon', count: activities.filter(a => a.type === 'milestone_reached').length },
    { id: 'friend_joined', label: 'New Friends', icon: 'person-add', count: activities.filter(a => a.type === 'friend_joined').length },
  ].filter(filter => filter.count > 0 || filter.id === 'all'), [activities]);

  const timeFilters = [
    { id: 'today', label: 'Today', icon: 'today' },
    { id: 'week', label: 'This Week', icon: 'calendar' },
    { id: 'month', label: 'This Month', icon: 'calendar-outline' },
    { id: 'all', label: 'All Time', icon: 'infinite' },
  ];

  useEffect(() => {
    setLoading(true);
    loadActivities().finally(() => setLoading(false));
  }, [loadActivities]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Friend Activity</Text>
        <Text style={styles.headerSubtitle}>
          {filteredActivities.length} recent activit{filteredActivities.length !== 1 ? 'ies' : 'y'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name="options" size={24} color={showFilters ? colors.primary : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search activities..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        {/* Activity Type Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Activity Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              {activityFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    activeFilter === filter.id && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(filter.id as ActivityFilter)}
                >
                  <Ionicons 
                    name={filter.icon as any} 
                    size={16} 
                    color={activeFilter === filter.id ? colors.white : colors.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      activeFilter === filter.id && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  {filter.count > 0 && (
                    <View
                      style={[
                        styles.filterChipBadge,
                        activeFilter === filter.id && styles.filterChipBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipBadgeText,
                          activeFilter === filter.id && styles.filterChipBadgeTextActive,
                        ]}
                      >
                        {filter.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Time Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Time Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              {timeFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    timeFilter === filter.id && styles.filterChipActive,
                  ]}
                  onPress={() => setTimeFilter(filter.id as TimeFilter)}
                >
                  <Ionicons 
                    name={filter.icon as any} 
                    size={16} 
                    color={timeFilter === filter.id ? colors.white : colors.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      timeFilter === filter.id && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderActivityStats = () => {
    const todayCount = activities.filter(activity => {
      const today = new Date();
      const activityDate = new Date(activity.created_at);
      return activityDate.toDateString() === today.toDateString();
    }).length;

    const weekCount = activities.filter(activity => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(activity.created_at) > weekAgo;
    }).length;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{todayCount}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{weekCount}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{friends.length}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
      </View>
    );
  };

  const renderActivityList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading friend activities...</Text>
        </View>
      );
    }

    if (filteredActivities.length === 0) {
      let title = 'No activities yet';
      let message = 'Your friends haven\'t been active recently. Encourage them to share their food experiences!';

      if (searchQuery) {
        title = 'No matching activities';
        message = `No activities match "${searchQuery}". Try adjusting your search terms.`;
      } else if (activeFilter !== 'all') {
        title = 'No activities of this type';
        message = 'Try selecting a different activity type or time period.';
      }

      return (
        <View style={styles.emptyState}>
          <Ionicons name="pulse-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>{title}</Text>
          <Text style={styles.emptyStateMessage}>{message}</Text>
          
          {(activeFilter !== 'all' || timeFilter !== 'week' || searchQuery) && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setActiveFilter('all');
                setTimeFilter('week');
                setSearchQuery('');
              }}
            >
              <Text style={styles.clearFiltersText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.activityContainer}>
        <FriendActivityFeed
          activities={filteredActivities}
          onActivityPress={handleActivityPress}
          onUserPress={handleUserPress}
          showTimestamp
          compact={false}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderActivityStats()}
      {renderSearchBar()}
      {renderFilters()}

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
        {renderActivityList()}
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

  filterButton: {
    padding: spacing(0.5),
  },

  filterButtonActive: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: spacing(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginBottom: spacing(0.25),
  },

  statLabel: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    gap: spacing(1),
  },

  searchInput: {
    flex: 1,
    fontSize: fonts.base,
    color: colors.text,
  },

  filtersContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  filterSection: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },

  filterSectionTitle: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  filterButtons: {
    flexDirection: 'row',
    gap: spacing(1),
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceVariant,
    gap: spacing(0.5),
  },

  filterChipActive: {
    backgroundColor: colors.primary,
  },

  filterChipText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  filterChipTextActive: {
    color: colors.white,
  },

  filterChipBadge: {
    backgroundColor: colors.white,
    borderRadius: radii.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(0.5),
  },

  filterChipBadgeActive: {
    backgroundColor: colors.primaryLight,
  },

  filterChipBadgeText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.textSecondary,
  },

  filterChipBadgeTextActive: {
    color: colors.primary,
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

  emptyStateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(2),
  },

  clearFiltersButton: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },

  clearFiltersText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },

  activityContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginTop: spacing(1),
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
});