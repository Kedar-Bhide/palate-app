import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ProfileStats as ProfileStatsType, Achievement } from '../../types/profile';
import { theme } from '../../theme';
import Card from '../ui/Card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ProfileStatsProps {
  stats: ProfileStatsType;
  achievements?: Achievement[];
  onPostsPress: () => void;
  onFriendsPress: () => void;
  onCuisinesPress: () => void;
  onAchievementPress?: (achievement: Achievement) => void;
  showAchievements?: boolean;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  stats,
  achievements = [],
  onPostsPress,
  onFriendsPress,
  onCuisinesPress,
  onAchievementPress,
  showAchievements = true,
}) => {
  const renderStatItem = (
    label: string,
    value: number,
    onPress: () => void,
    icon: keyof typeof MaterialIcons.glyphMap
  ) => (
    <TouchableOpacity
      style={styles.statItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
    >
      <View style={styles.statIconContainer}>
        <MaterialIcons
          name={icon}
          size={20}
          color={theme.colors.primary}
        />
      </View>
      <Text style={styles.statNumber}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.statLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAchievementBadge = (achievement: Achievement, index: number) => (
    <TouchableOpacity
      key={achievement.id}
      style={[
        styles.achievementBadge,
        { backgroundColor: achievement.color || theme.colors.primary },
      ]}
      onPress={() => onAchievementPress?.(achievement)}
      accessibilityRole="button"
      accessibilityLabel={`Achievement: ${achievement.title}`}
    >
      <Text style={styles.achievementIcon}>
        {achievement.icon || '🏆'}
      </Text>
    </TouchableOpacity>
  );

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const displayAchievements = unlockedAchievements.slice(0, 4); // Show max 4 achievements

  return (
    <View style={styles.container}>
      {/* Main Stats */}
      <Card variant="elevated" padding="large" style={styles.statsCard}>
        <View style={styles.statsRow}>
          {renderStatItem('Posts', stats.postsCount, onPostsPress, 'restaurant')}
          
          <View style={styles.statsDivider} />
          
          {renderStatItem('Friends', stats.friendsCount, onFriendsPress, 'people')}
          
          <View style={styles.statsDivider} />
          
          {renderStatItem('Cuisines', stats.cuisinesCount, onCuisinesPress, 'explore')}
        </View>
      </Card>

      {/* Achievements Section */}
      {showAchievements && displayAchievements.length > 0 && (
        <Card variant="flat" padding="medium" style={styles.achievementsCard}>
          <View style={styles.achievementsHeader}>
            <View style={styles.achievementsTitleRow}>
              <MaterialIcons
                name="emoji-events"
                size={20}
                color={theme.colors.warning}
              />
              <Text style={styles.achievementsTitle}>
                Achievements
              </Text>
            </View>
            
            {unlockedAchievements.length > 4 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {/* Navigate to all achievements */}}
                accessibilityRole="button"
                accessibilityLabel="View all achievements"
              >
                <Text style={styles.viewAllText}>
                  View All ({unlockedAchievements.length})
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsScroll}
          >
            {displayAchievements.map((achievement, index) => 
              renderAchievementBadge(achievement, index)
            )}
            
            {/* Show placeholder for locked achievements */}
            {displayAchievements.length < 4 && Array.from({ 
              length: Math.min(2, 4 - displayAchievements.length) 
            }).map((_, index) => (
              <View
                key={`placeholder-${index}`}
                style={[styles.achievementBadge, styles.lockedAchievement]}
              >
                <MaterialIcons
                  name="lock"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </View>
            ))}
          </ScrollView>

          {/* Achievement Progress Hint */}
          {unlockedAchievements.length < achievements.length && (
            <Text style={styles.progressHint}>
              {unlockedAchievements.length} of {achievements.length} achievements unlocked
            </Text>
          )}
        </Card>
      )}

      {/* Quick Stats Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <MaterialIcons
            name="calendar-today"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.summaryText}>
            Member since {new Date(stats.joinDate).getFullYear()}
          </Text>
        </View>
        
        {stats.achievementsCount > 0 && (
          <View style={styles.summaryItem}>
            <MaterialIcons
              name="star"
              size={14}
              color={theme.colors.warning}
            />
            <Text style={styles.summaryText}>
              {stats.achievementsCount} achievement{stats.achievementsCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
  },
  statsCard: {
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statNumber: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.outline,
  },
  achievementsCard: {
    marginBottom: theme.spacing.md,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  achievementsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementsTitle: {
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
  achievementsScroll: {
    paddingBottom: theme.spacing.sm,
  },
  achievementBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  lockedAchievement: {
    backgroundColor: theme.colors.gray[200],
    borderWidth: 2,
    borderColor: theme.colors.outline,
    borderStyle: 'dashed',
  },
  achievementIcon: {
    fontSize: 20,
  },
  progressHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  summaryText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
});

export default ProfileStats;