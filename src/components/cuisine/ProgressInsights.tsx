import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { UserCuisineProgress } from '../../types/cuisine';
import { getDiversityMetrics, getCuisinesByCategory, getMonthlyProgress } from '../../lib/cuisineUtils';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface ProgressInsightsProps {
  userProgress: UserCuisineProgress[];
  timeRange: 'month' | 'year' | 'all';
  onTimeRangeChange: (range: 'month' | 'year' | 'all') => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ProgressInsights({
  userProgress,
  timeRange,
  onTimeRangeChange,
}: ProgressInsightsProps) {
  const allCuisines = useMemo(() => {
    return userProgress.map(p => p.cuisine).filter(Boolean) as any[];
  }, [userProgress]);

  const filteredProgress = useMemo(() => {
    const now = new Date();
    
    switch (timeRange) {
      case 'month':
        return userProgress.filter(p => {
          const progressDate = new Date(p.first_tried_at);
          return progressDate.getMonth() === now.getMonth() && 
                 progressDate.getFullYear() === now.getFullYear();
        });
      
      case 'year':
        return userProgress.filter(p => {
          const progressDate = new Date(p.first_tried_at);
          return progressDate.getFullYear() === now.getFullYear();
        });
      
      default:
        return userProgress;
    }
  }, [userProgress, timeRange]);

  const diversityMetrics = useMemo(() => {
    return getDiversityMetrics(filteredProgress, allCuisines);
  }, [filteredProgress, allCuisines]);

  const categoryData = useMemo(() => {
    return getCuisinesByCategory(allCuisines, filteredProgress);
  }, [allCuisines, filteredProgress]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[monthKey] = 0;
    }

    userProgress.forEach(progress => {
      const progressDate = new Date(progress.first_tried_at);
      const monthKey = progressDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (months.hasOwnProperty(monthKey)) {
        months[monthKey]++;
      }
    });

    return months;
  }, [userProgress]);

  const discoveryPattern = useMemo(() => {
    const patterns = {
      'Early Bird': 0, // 6 AM - 12 PM
      'Afternoon Explorer': 0, // 12 PM - 6 PM
      'Evening Adventurer': 0, // 6 PM - 10 PM
      'Night Owl': 0, // 10 PM - 6 AM
    };

    userProgress.forEach(progress => {
      const hour = new Date(progress.first_tried_at).getHours();
      if (hour >= 6 && hour < 12) patterns['Early Bird']++;
      else if (hour >= 12 && hour < 18) patterns['Afternoon Explorer']++;
      else if (hour >= 18 && hour < 22) patterns['Evening Adventurer']++;
      else patterns['Night Owl']++;
    });

    return patterns;
  }, [userProgress]);

  const topCategories = useMemo(() => {
    return categoryData
      .sort((a, b) => b.triedCount - a.triedCount)
      .slice(0, 5);
  }, [categoryData]);

  const streakInfo = useMemo(() => {
    if (userProgress.length === 0) return { current: 0, longest: 0 };

    const sortedProgress = [...userProgress].sort(
      (a, b) => new Date(a.first_tried_at).getTime() - new Date(b.first_tried_at).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedProgress.length; i++) {
      const prevDate = new Date(sortedProgress[i - 1].first_tried_at);
      const currDate = new Date(sortedProgress[i].first_tried_at);
      const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 7) { // Within a week
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    const now = new Date();
    const recentProgress = sortedProgress.reverse();
    for (const progress of recentProgress) {
      const daysSince = Math.floor((now.getTime() - new Date(progress.first_tried_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { current: currentStreak, longest: longestStreak };
  }, [userProgress]);

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeSelector}>
      {(['month', 'year', 'all'] as const).map((range) => (
        <Text
          key={range}
          style={[
            styles.timeRangeOption,
            timeRange === range && styles.timeRangeOptionActive,
          ]}
          onPress={() => onTimeRangeChange(range)}
        >
          {range === 'month' ? 'This Month' : 
           range === 'year' ? 'This Year' : 'All Time'}
        </Text>
      ))}
    </View>
  );

  const renderProgressChart = () => {
    const maxCount = Math.max(...Object.values(monthlyData), 1);
    const chartWidth = screenWidth - spacing(4);
    const barWidth = (chartWidth - spacing(5)) / 6;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Progress</Text>
        <View style={styles.chart}>
          {Object.entries(monthlyData).map(([month, count]) => (
            <View key={month} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (count / maxCount) * 80,
                    width: barWidth,
                    backgroundColor: count > 0 ? colors.primary : colors.surfaceVariant,
                  },
                ]}
              />
              <Text style={styles.barLabel}>{month}</Text>
              <Text style={styles.barValue}>{count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCategoryBreakdown = () => (
    <View style={styles.categoryContainer}>
      <Text style={styles.sectionTitle}>Favorite Categories</Text>
      {topCategories.map((category, index) => {
        const percentage = Math.round((category.triedCount / filteredProgress.length) * 100) || 0;
        return (
          <View key={category.name} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryRank}>#{index + 1}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
            <View style={styles.categoryStats}>
              <Text style={styles.categoryCount}>{category.triedCount}</Text>
              <View style={styles.categoryProgressBar}>
                <View
                  style={[
                    styles.categoryProgressFill,
                    { width: `${percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.categoryPercentage}>{percentage}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderDiscoveryPatterns = () => {
    const total = Object.values(discoveryPattern).reduce((sum, count) => sum + count, 0);
    
    return (
      <View style={styles.patternContainer}>
        <Text style={styles.sectionTitle}>Discovery Patterns</Text>
        {Object.entries(discoveryPattern).map(([pattern, count]) => {
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <View key={pattern} style={styles.patternItem}>
              <View style={styles.patternIcon}>
                <Text style={styles.patternEmoji}>
                  {pattern.includes('Early') ? '🌅' :
                   pattern.includes('Afternoon') ? '☀️' :
                   pattern.includes('Evening') ? '🌆' : '🌙'}
                </Text>
              </View>
              <View style={styles.patternInfo}>
                <Text style={styles.patternName}>{pattern}</Text>
                <Text style={styles.patternStats}>{count} cuisines • {percentage}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderInsightCards = () => (
    <View style={styles.insightCards}>
      <View style={styles.insightCard}>
        <Text style={styles.insightValue}>{diversityMetrics.score}</Text>
        <Text style={styles.insightLabel}>Diversity Score</Text>
        <Text style={styles.insightDescription}>
          You've explored {diversityMetrics.triedCategories} of {diversityMetrics.totalCategories} categories
        </Text>
      </View>

      <View style={styles.insightCard}>
        <Text style={styles.insightValue}>{streakInfo.longest}</Text>
        <Text style={styles.insightLabel}>Longest Streak</Text>
        <Text style={styles.insightDescription}>
          Current: {streakInfo.current} cuisines
        </Text>
      </View>

      <View style={styles.insightCard}>
        <Text style={styles.insightValue}>
          {timeRange === 'month' ? getMonthlyProgress(filteredProgress) : filteredProgress.length}
        </Text>
        <Text style={styles.insightLabel}>
          {timeRange === 'month' ? 'This Month' : 
           timeRange === 'year' ? 'This Year' : 'Total'}
        </Text>
        <Text style={styles.insightDescription}>
          Cuisines explored
        </Text>
      </View>
    </View>
  );

  if (userProgress.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitle}>No Insights Yet</Text>
        <Text style={styles.emptyMessage}>
          Start exploring cuisines to see your progress analytics!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderTimeRangeSelector()}
      {renderInsightCards()}
      {renderProgressChart()}
      {renderCategoryBreakdown()}
      {renderDiscoveryPatterns()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginVertical: spacing(1),
    borderRadius: radii.md,
    padding: spacing(0.25),
    ...shadows.small,
  },

  timeRangeOption: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1),
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    borderRadius: radii.sm,
  },

  timeRangeOptionActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },

  insightCards: {
    flexDirection: 'row',
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
    gap: spacing(1),
  },

  insightCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing(1.5),
    borderRadius: radii.lg,
    alignItems: 'center',
    ...shadows.small,
  },

  insightValue: {
    fontSize: fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginBottom: spacing(0.25),
  },

  insightLabel: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  insightDescription: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  chartContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
    padding: spacing(2),
    borderRadius: radii.lg,
    ...shadows.small,
  },

  chartTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1.5),
  },

  chart: {
    flexDirection: 'row',
    alignItems: 'end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: spacing(2),
  },

  barContainer: {
    alignItems: 'center',
    flex: 1,
  },

  bar: {
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    marginBottom: spacing(0.5),
  },

  barLabel: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    marginBottom: spacing(0.25),
  },

  barValue: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  categoryContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
    padding: spacing(2),
    borderRadius: radii.lg,
    ...shadows.small,
  },

  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1.5),
  },

  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },

  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  categoryRank: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    marginRight: spacing(1),
    width: 20,
  },

  categoryName: {
    fontSize: fonts.base,
    color: colors.text,
    flex: 1,
  },

  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },

  categoryCount: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    minWidth: 20,
  },

  categoryProgressBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.full,
    overflow: 'hidden',
  },

  categoryProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },

  categoryPercentage: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    minWidth: 30,
  },

  patternContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
    padding: spacing(2),
    borderRadius: radii.lg,
    ...shadows.small,
  },

  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },

  patternIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(1.5),
  },

  patternEmoji: {
    fontSize: 20,
  },

  patternInfo: {
    flex: 1,
  },

  patternName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  patternStats: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
  },

  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },

  emptyTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },
});