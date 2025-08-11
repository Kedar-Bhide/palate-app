import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ProgressStats as ProgressStatsType, Achievement } from '../../types/cuisine';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface ProgressStatsProps {
  stats: ProgressStatsType;
  achievements: Achievement[];
  onAchievementPress?: (achievement: Achievement) => void;
}

export default function ProgressStats({
  stats,
  achievements,
  onAchievementPress,
}: ProgressStatsProps) {
  const progressWidth = Math.min(stats.percentage, 100);
  const nextGoalProgress = stats.nextGoal.goal > 0 ? 
    ((stats.triedCuisines / stats.nextGoal.goal) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Main Progress Counter */}
      <View style={styles.mainCounter}>
        <Text style={styles.counterNumber}>{stats.triedCuisines}</Text>
        <Text style={styles.counterLabel}>
          cuisine{stats.triedCuisines !== 1 ? 's' : ''} explored
        </Text>
      </View>

      {/* Overall Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPercentage}>{stats.percentage}%</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill,
                { width: `${progressWidth}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {stats.triedCuisines} of {stats.totalCuisines} cuisines
          </Text>
        </View>
      </View>

      {/* Goal Progress */}
      <View style={styles.goalSection}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalLabel}>Next Goal</Text>
          <Text style={styles.goalRemaining}>
            {stats.nextGoal.remaining} to go
          </Text>
        </View>
        
        <View style={styles.goalProgressContainer}>
          <View style={styles.goalProgressBar}>
            <View 
              style={[
                styles.goalProgressFill,
                { width: `${Math.min(nextGoalProgress, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.goalText}>
            {stats.triedCuisines}/{stats.nextGoal.goal} cuisines
          </Text>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.diversityScore}</Text>
          <Text style={styles.statLabel}>Diversity Score</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.monthlyProgress}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>

      {/* Achievement Badges */}
      {achievements.length > 0 && (
        <View style={styles.achievementsSection}>
          <Text style={styles.achievementsTitle}>Recent Achievements</Text>
          <View style={styles.achievementsList}>
            {achievements.slice(0, 3).map((achievement) => (
              <TouchableOpacity
                key={achievement.id}
                style={styles.achievementBadge}
                onPress={() => onAchievementPress?.(achievement)}
                activeOpacity={0.8}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDescription} numberOfLines={1}>
                    {achievement.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginVertical: spacing(1),
    ...shadows.medium,
  },

  mainCounter: {
    alignItems: 'center',
    marginBottom: spacing(2),
  },

  counterNumber: {
    fontSize: 48,
    fontWeight: fonts.weights.bold,
    color: colors.primary,
    lineHeight: 56,
  },

  counterLabel: {
    fontSize: fonts.lg,
    color: colors.textSecondary,
    marginTop: -spacing(0.5),
  },

  progressSection: {
    marginBottom: spacing(2),
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.75),
  },

  progressLabel: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  progressPercentage: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
  },

  progressBarContainer: {
    alignItems: 'center',
  },

  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing(0.5),
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },

  progressText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  goalSection: {
    marginBottom: spacing(2),
    paddingTop: spacing(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.75),
  },

  goalLabel: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  goalRemaining: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.accent,
  },

  goalProgressContainer: {
    alignItems: 'center',
  },

  goalProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing(0.5),
  },

  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
  },

  goalText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
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

  achievementsSection: {
    marginTop: spacing(2),
    paddingTop: spacing(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  achievementsTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
  },

  achievementsList: {
    gap: spacing(0.75),
  },

  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing(1),
  },

  achievementIcon: {
    fontSize: 24,
    marginRight: spacing(1),
  },

  achievementInfo: {
    flex: 1,
  },

  achievementName: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
  },

  achievementDescription: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
  },
});