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
import ProgressIndicator from '../components/cuisine/ProgressIndicator';
import AchievementBadge from '../components/cuisine/AchievementBadge';
import AchievementModal from '../components/cuisine/AchievementModal';
import ProgressCelebration from '../components/cuisine/ProgressCelebration';
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
    achievements: cuisineAchievements,
    loading,
    error,
    refreshData,
    markCuisineTried,
    getPredictedCuisines,
    getDiversityMetrics,
    getCuisineStatistics,
  } = useCuisineProgress();

  const {
    achievements,
    checkAchievements,
    unlockAchievement,
    getAchievementProgress,
    shareAchievement,
    getNextAchievements,
    getUserStats,
    unlockedAchievements,
    recentlyUnlocked,
    clearRecentlyUnlocked,
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
  const [diversityMetrics, setDiversityMetrics] = useState<any>(null);
  const [predictedCuisines, setPredictedCuisines] = useState<Cuisine[]>([]);
  const [celebrationAchievement, setCelebrationAchievement] = useState<Achievement | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

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

  const handleMarkAsTried = useCallback(async (cuisine: Cuisine, restaurantName?: string, notes?: string, rating?: number) => {
    try {
      await markCuisineTried(cuisine.id, restaurantName || '', notes, rating);
      
      // Update metrics after marking
      const newMetrics = getDiversityMetrics();
      setDiversityMetrics(newMetrics);
      
      // Get new predictions
      const newPredictions = getPredictedCuisines(5);
      setPredictedCuisines(newPredictions);
      
      Alert.alert(
        'Success!',
        `${cuisine.name} has been added to your culinary journey! 🎉`
      );
    } catch (err) {
      console.error('Error marking cuisine as tried:', err);
      Alert.alert('Error', 'Failed to mark cuisine as tried. Please try again.');
    }
  }, [markCuisineTried, getDiversityMetrics, getPredictedCuisines]);

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

  // Update metrics and predictions when data changes
  useEffect(() => {
    if (userProgress.length > 0 && cuisines.length > 0) {
      const metrics = getDiversityMetrics();
      setDiversityMetrics(metrics);
      
      const predictions = getPredictedCuisines(5);
      setPredictedCuisines(predictions);
    }
  }, [userProgress, cuisines, getDiversityMetrics, getPredictedCuisines]);

  // Check for new achievements when progress changes (memoized to prevent excessive checks)
  const lastProgressLength = useRef(0);
  useEffect(() => {
    // Only check when progress actually increases (new cuisines added)
    if (userProgress.length > lastProgressLength.current) {
      const newAchievements = checkAchievements(userProgress, cuisines);
      
      if (newAchievements.length > 0) {
        // Process achievements sequentially to prevent race conditions
        const processAchievements = async () => {
          for (const achievement of newAchievements) {
            try {
              await unlockAchievement(achievement.id);
              // Show celebration modal with slight delay for better UX
              setTimeout(() => {
                setCelebrationAchievement(achievement);
                setShowCelebration(true);
              }, 500);
            } catch (error) {
              console.error(`Failed to unlock achievement ${achievement.id}:`, error);
              // Could add user-friendly error notification here
            }
          }
        };
        
        processAchievements();
      }
      
      lastProgressLength.current = userProgress.length;
    }
  }, [userProgress.length, checkAchievements, unlockAchievement, cuisines]);

  // Handle celebration close
  const handleCelebrationClose = useCallback(() => {
    setShowCelebration(false);
    setCelebrationAchievement(null);
    clearRecentlyUnlocked();
  }, [clearRecentlyUnlocked]);

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
            {/* Enhanced Progress Indicator */}
            <View style={styles.progressSection}>
              <ProgressIndicator
                progress={stats.triedCuisines}
                total={stats.totalCuisines}
                goal={stats.nextGoal.goal}
                achievements={cuisineAchievements.slice(0, 3)}
                onAchievementPress={handleAchievementPress}
                size="large"
                animated={true}
              />
            </View>

            {/* Enhanced Progress Stats */}
            <ProgressStats
              stats={{
                ...stats,
                diversityScore: diversityMetrics?.score || stats.diversityScore,
                currentStreak: diversityMetrics?.streak || stats.currentStreak,
                monthlyProgress: diversityMetrics?.monthlyProgress?.thisMonth || stats.monthlyProgress
              }}
              achievements={achievements.slice(0, 3)}
              onAchievementPress={handleAchievementPress}
            />

            {/* Achievement Showcase */}
            <View style={styles.achievementSection}>
              <View style={styles.achievementHeader}>
                <Text style={styles.achievementTitle}>Achievements</Text>
                <View style={styles.achievementStats}>
                  <Text style={styles.achievementCount}>
                    {unlockedAchievements.size} / {achievements.length}
                  </Text>
                  <View style={styles.achievementTierBadge}>
                    <Text style={styles.achievementTierText}>
                      {getUserStats().highestTier.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Achievement Categories */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.achievementList}>
                  {achievements.slice(0, 8).map((achievement) => {
                    const progress = getAchievementProgress(achievement.id, userProgress);
                    const isUnlocked = unlockedAchievements.has(achievement.id);
                    return (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        isUnlocked={isUnlocked}
                        progress={progress.progress}
                        onPress={() => handleAchievementPress(achievement)}
                        size="medium"
                        showCelebration={recentlyUnlocked.some(a => a.id === achievement.id)}
                      />
                    );
                  })}
                </View>
              </ScrollView>

              {/* Next Achievements */}
              <View style={styles.nextAchievementsSection}>
                <Text style={styles.nextAchievementsTitle}>Up Next</Text>
                <View style={styles.nextAchievementsList}>
                  {getNextAchievements(userProgress, cuisines).slice(0, 3).map((achievement) => {
                    const progress = getAchievementProgress(achievement.id, userProgress);
                    return (
                      <TouchableOpacity
                        key={achievement.id}
                        style={styles.nextAchievementItem}
                        onPress={() => handleAchievementPress(achievement)}
                      >
                        <Text style={styles.nextAchievementIcon}>{achievement.icon}</Text>
                        <View style={styles.nextAchievementContent}>
                          <Text style={styles.nextAchievementName} numberOfLines={1}>
                            {achievement.name}
                          </Text>
                          <View style={styles.nextAchievementProgress}>
                            <View style={styles.nextProgressBar}>
                              <View 
                                style={[
                                  styles.nextProgressFill,
                                  { width: `${progress.progress * 100}%` }
                                ]}
                              />
                            </View>
                            <Text style={styles.nextProgressText}>
                              {progress.current}/{progress.target}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
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
          <View style={styles.insightsContainer}>
            {/* Diversity Metrics */}
            {diversityMetrics && (
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Exploration Metrics</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{diversityMetrics.score}</Text>
                    <Text style={styles.metricLabel}>Diversity Score</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{diversityMetrics.streak}</Text>
                    <Text style={styles.metricLabel}>Week Streak</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{diversityMetrics.monthlyProgress.thisMonth}</Text>
                    <Text style={styles.metricLabel}>This Month</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>
                      {diversityMetrics.monthlyProgress.trend === 'increasing' ? '↗️' : 
                       diversityMetrics.monthlyProgress.trend === 'decreasing' ? '↘️' : '➡️'}
                    </Text>
                    <Text style={styles.metricLabel}>Trend</Text>
                  </View>
                </View>
              </View>
            )}
            
            <ProgressInsights
              userProgress={userProgress}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </View>
        )}

        {activeTab === 'suggestions' && (
          <View style={styles.suggestionsContainer}>
            {/* AI Predictions */}
            <View style={styles.predictionSection}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <Text style={styles.sectionSubtitle}>
                Based on your taste preferences and exploration patterns
              </Text>
              {predictedCuisines.map((cuisine, index) => (
                <TouchableOpacity
                  key={cuisine.id}
                  style={styles.predictionItem}
                  onPress={() => handleCuisinePress(cuisine)}
                >
                  <Text style={styles.predictionEmoji}>{cuisine.emoji}</Text>
                  <View style={styles.predictionContent}>
                    <Text style={styles.predictionName}>{cuisine.name}</Text>
                    <Text style={styles.predictionCategory}>{cuisine.category}</Text>
                  </View>
                  <Text style={styles.predictionRank}>#{index + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <CuisineSuggestions
              userProgress={userProgress}
              onSuggestionPress={handleCuisinePress}
            />
          </View>
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

      {/* Achievement Celebration */}
      {celebrationAchievement && (
        <ProgressCelebration
          achievement={celebrationAchievement}
          visible={showCelebration}
          onClose={handleCelebrationClose}
          onShare={() => shareAchievement(celebrationAchievement)}
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

  achievementStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  achievementCount: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  achievementTierBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },

  achievementTierText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  achievementList: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    gap: spacing(0.5),
  },

  progressSection: {
    backgroundColor: colors.white,
    padding: spacing(3),
    alignItems: 'center',
    marginBottom: spacing(1),
  },

  suggestionsContainer: {
    padding: spacing(2),
  },

  predictionSection: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    ...shadows.small,
  },

  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  sectionSubtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginBottom: spacing(2),
  },

  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(1.5),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing(1),
  },

  predictionEmoji: {
    fontSize: 24,
    marginRight: spacing(1.5),
  },

  predictionContent: {
    flex: 1,
  },

  predictionName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  predictionCategory: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  predictionRank: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
  },

  insightsContainer: {
    padding: spacing(2),
  },

  metricsSection: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    ...shadows.small,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },

  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.md,
    padding: spacing(1.5),
    alignItems: 'center',
  },

  metricValue: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginBottom: spacing(0.5),
  },

  metricLabel: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Next Achievements Styles
  nextAchievementsSection: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  nextAchievementsTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  nextAchievementsList: {
    gap: spacing(1),
  },

  nextAchievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing(1.5),
    borderRadius: radii.md,
  },

  nextAchievementIcon: {
    fontSize: 20,
    marginRight: spacing(1.5),
    opacity: 0.7,
  },

  nextAchievementContent: {
    flex: 1,
  },

  nextAchievementName: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  nextAchievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  nextProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: 2,
    overflow: 'hidden',
  },

  nextProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  nextProgressText: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
    minWidth: 40,
    textAlign: 'right',
  },
});