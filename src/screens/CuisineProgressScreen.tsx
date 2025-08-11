import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Cuisine, CuisineFilter, Achievement, Goal } from '../types/cuisine';
import { useCuisineProgress } from '../hooks/useCuisineProgress';
import { useAchievements } from '../hooks/useAchievements';
import ProgressStats from '../components/cuisine/ProgressStats';
import CuisineGrid from '../components/cuisine/CuisineGrid';
import AchievementBadge from '../components/cuisine/AchievementBadge';
import AchievementModal from '../components/cuisine/AchievementModal';
import ProgressInsights from '../components/cuisine/ProgressInsights';
import CuisineSuggestions from '../components/cuisine/CuisineSuggestions';
import GoalSetting from '../components/cuisine/GoalSetting';
import { Input } from '../components/ui/Input';
import { colors, spacing, radii, fonts, shadows } from '../theme/uiTheme';

export default function CuisineProgressScreen() {
  const navigation = useNavigation();
  const {
    cuisines,
    userProgress,
    stats,
    loading,
    error,
    refreshData,
    markCuisineTried,
  } = useCuisineProgress();

  const {
    achievements,
    checkAchievements,
    unlockAchievement,
    getAchievementProgress,
    shareAchievement,
    getNextAchievements,
  } = useAchievements();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<CuisineFilter>({
    status: 'all',
    searchQuery: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'suggestions' | 'goals'>('overview');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [currentGoals, setCurrentGoals] = useState<Goal[]>([]);
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'all'>('all');

  useEffect(() => {
    setFilter(prev => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleFilterChange = useCallback((newStatus: 'all' | 'tried' | 'untried') => {
    setFilter(prev => ({ ...prev, status: newStatus }));
  }, []);

  const handleCuisinePress = useCallback((cuisine: Cuisine) => {
    navigation.navigate('CuisineDetail' as never, {
      cuisineId: cuisine.id,
      fromScreen: 'progress',
    } as never);
  }, [navigation]);

  const handleMarkAsTried = useCallback(async (cuisine: Cuisine) => {
    Alert.prompt(
      'Restaurant Name',
      'Where did you try this cuisine? (Optional)',
      async (restaurantName) => {
        try {
          await markCuisineTried(cuisine.id, restaurantName || '');
          Alert.alert(
            'Success!',
            `${cuisine.name} has been added to your culinary journey! 🎉`
          );
        } catch (err) {
          console.error('Error marking cuisine as tried:', err);
          Alert.alert('Error', 'Failed to mark cuisine as tried. Please try again.');
        }
      },
      'plain-text',
      '',
      'default'
    );
  }, [markCuisineTried]);

  const handleAchievementPress = useCallback((achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setShowAchievementModal(true);
  }, []);

  const handleAchievementShare = useCallback(() => {
    setShowAchievementModal(false);
    // Share functionality is handled in the modal
  }, []);

  const handleGoalSet = useCallback((goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setCurrentGoals(prev => [...prev, newGoal]);
  }, []);

  const handleGoalUpdate = useCallback((goalId: string, progress: number) => {
    setCurrentGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, current: progress, completed: progress >= goal.target }
        : goal
    ));
  }, []);

  // Check for new achievements when progress changes
  useEffect(() => {
    if (userProgress.length > 0) {
      const newAchievements = checkAchievements(userProgress);
      newAchievements.forEach(async achievement => {
        try {
          await unlockAchievement(achievement.id);
          // Show celebration
          Alert.alert(
            '🎉 Achievement Unlocked!',
            `${achievement.name}: ${achievement.description}`,
            [{ text: 'Amazing!', style: 'default' }]
          );
        } catch (error) {
          console.error('Error unlocking achievement:', error);
        }
      });
    }
  }, [userProgress, checkAchievements, unlockAchievement]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Cuisine Explorer</Text>
            <Text style={styles.headerSubtitle}>
              Your culinary journey
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'grid-outline' },
          { key: 'insights', label: 'Insights', icon: 'analytics-outline' },
          { key: 'suggestions', label: 'Suggestions', icon: 'bulb-outline' },
          { key: 'goals', label: 'Goals', icon: 'flag-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
        {activeTab === 'overview' && (
          <>
            {/* Progress Stats */}
            <ProgressStats
              stats={stats}
              achievements={achievements.slice(0, 3)}
              onAchievementPress={handleAchievementPress}
            />

            {/* Achievement Showcase */}
            <View style={styles.achievementSection}>
              <View style={styles.achievementHeader}>
                <Text style={styles.achievementTitle}>Recent Achievements</Text>
                <Text style={styles.achievementCount}>
                  {achievements.filter(a => a.unlockedAt).length} unlocked
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.achievementList}>
                  {achievements.slice(0, 6).map((achievement) => {
                    const progress = getAchievementProgress(achievement.id, userProgress);
                    return (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        isUnlocked={progress.isUnlocked}
                        progress={progress.progress}
                        onPress={() => handleAchievementPress(achievement)}
                        size="medium"
                      />
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Search and Filters */}
            <View style={styles.filtersContainer}>
          <Input
            variant="outlined"
            placeholder="Search cuisines..."
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
            onRightIconPress={searchQuery ? clearSearch : undefined}
            style={styles.searchInput}
          />

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            {[
              { key: 'all', label: 'All', count: cuisines.length },
              { key: 'tried', label: 'Tried', count: userProgress.length },
              { key: 'untried', label: 'Untried', count: cuisines.length - userProgress.length },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  filter.status === tab.key && styles.filterTabActive,
                ]}
                onPress={() => handleFilterChange(tab.key as any)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter.status === tab.key && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

            {/* Cuisine Grid */}
            <View style={styles.gridContainer}>
              <CuisineGrid
                cuisines={cuisines}
                userProgress={userProgress}
                searchQuery={filter.searchQuery}
                filter={filter.status}
                onCuisinePress={handleCuisinePress}
                showCategories={!filter.searchQuery && filter.status === 'all'}
                loading={loading}
              />
            </View>
          </>
        )}

        {activeTab === 'insights' && (
          <ProgressInsights
            userProgress={userProgress}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        )}

        {activeTab === 'suggestions' && (
          <CuisineSuggestions
            userProgress={userProgress}
            onSuggestionPress={handleCuisinePress}
          />
        )}

        {activeTab === 'goals' && (
          <GoalSetting
            currentGoals={currentGoals}
            onGoalSet={handleGoalSet}
            onGoalUpdate={handleGoalUpdate}
            userProgress={userProgress}
          />
        )}
      </ScrollView>

      {/* Achievement Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          userProgress={getAchievementProgress(selectedAchievement.id, userProgress).progress}
          visible={showAchievementModal}
          onClose={() => setShowAchievementModal(false)}
          onShare={handleAchievementShare}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
    paddingBottom: spacing(1),
    ...shadows.small,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  filtersContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginBottom: spacing(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  searchInput: {
    marginBottom: spacing(1.5),
  },

  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.md,
    padding: spacing(0.25),
  },

  filterTab: {
    flex: 1,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1),
    borderRadius: radii.sm,
    alignItems: 'center',
  },

  filterTabActive: {
    backgroundColor: colors.primary,
  },

  filterTabText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  filterTabTextActive: {
    color: colors.white,
  },

  gridContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
  },

  errorEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },

  errorTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  errorMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(3),
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
  },

  retryButtonText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    gap: spacing(0.5),
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  tabText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  activeTabText: {
    color: colors.primary,
  },

  achievementSection: {
    backgroundColor: colors.white,
    marginBottom: spacing(1),
    paddingVertical: spacing(2),
  },

  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    marginBottom: spacing(1.5),
  },

  achievementTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  achievementCount: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  achievementList: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    gap: spacing(0.5),
  },
});