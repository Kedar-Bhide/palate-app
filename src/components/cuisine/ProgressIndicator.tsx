/**
 * ProgressIndicator Component
 * Animated visual progress indicator with circular progress and milestone display
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import { Achievement } from '../../types/cuisine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressIndicatorProps {
  progress: number;
  total: number;
  goal?: number;
  animated?: boolean;
  showPercentage?: boolean;
  achievements?: Achievement[];
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  onPress?: () => void;
  onAchievementPress?: (achievement: Achievement) => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressIndicator({
  progress,
  total,
  goal,
  animated = true,
  showPercentage = true,
  achievements = [],
  size = 'medium',
  color = colors.primary,
  backgroundColor = colors.surfaceVariant,
  strokeWidth,
  onPress,
  onAchievementPress,
}: ProgressIndicatorProps) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0)).current;
  const animatedAchievements = useRef(new Animated.Value(0)).current;
  const [displayProgress, setDisplayProgress] = useState(0);

  // Determine component dimensions based on size
  const dimensions = getDimensions(size);
  const actualStrokeWidth = strokeWidth || dimensions.strokeWidth;
  const radius = (dimensions.size - actualStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate progress percentage
  const progressPercentage = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
  const goalPercentage = goal && total > 0 ? Math.min((goal / total) * 100, 100) : null;

  // Animation effects
  useEffect(() => {
    if (animated) {
      // Entrance animation
      Animated.spring(animatedScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Progress animation
      Animated.timing(animatedProgress, {
        toValue: progressPercentage,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      // Achievement celebration animation
      if (achievements.length > 0) {
        Animated.sequence([
          Animated.delay(1000),
          Animated.spring(animatedAchievements, {
            toValue: 1,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      animatedScale.setValue(1);
      animatedProgress.setValue(progressPercentage);
      animatedAchievements.setValue(achievements.length > 0 ? 1 : 0);
    }
  }, [progressPercentage, achievements.length, animated]);

  // Update display progress for counter animation
  useEffect(() => {
    if (animated) {
      const listener = animatedProgress.addListener(({ value }) => {
        setDisplayProgress(Math.round((value / 100) * progress));
      });

      return () => animatedProgress.removeListener(listener);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  // Handle press with haptic feedback
  const handlePress = async () => {
    if (onPress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleAchievementPress = async (achievement: Achievement) => {
    if (onAchievementPress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onAchievementPress(achievement);
    }
  };

  // Create stroke dash array for progress
  const strokeDasharray = `${circumference} ${circumference}`;
  const progressOffset = animated
    ? animatedProgress.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
        extrapolate: 'clamp',
      })
    : circumference - (progressPercentage / 100) * circumference;

  const goalOffset = goalPercentage
    ? circumference - (goalPercentage / 100) * circumference
    : null;

  const TouchableComponent = onPress ? TouchableOpacity : View;

  return (
    <TouchableComponent
      style={[styles.container, getDimensionStyles(dimensions)]}
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <Animated.View
        style={[
          styles.progressContainer,
          {
            transform: [{ scale: animatedScale }],
          },
        ]}
      >
        {/* SVG Progress Circle */}
        <Svg
          width={dimensions.size}
          height={dimensions.size}
          style={styles.svg}
        >
          {/* Background Circle */}
          <Circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={actualStrokeWidth}
            fill="transparent"
          />

          {/* Goal Indicator (if specified) */}
          {goalOffset !== null && (
            <Circle
              cx={dimensions.size / 2}
              cy={dimensions.size / 2}
              r={radius}
              stroke={colors.warning + '50'}
              strokeWidth={actualStrokeWidth + 2}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={goalOffset}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90 ${dimensions.size / 2} ${dimensions.size / 2})`}
            />
          )}

          {/* Progress Circle */}
          <AnimatedCircle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            stroke={color}
            strokeWidth={actualStrokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90 ${dimensions.size / 2} ${dimensions.size / 2})`}
          />
        </Svg>

        {/* Center Content */}
        <View style={styles.centerContent}>
          {/* Progress Number */}
          <Text style={[styles.progressNumber, getDimensionStyles(dimensions).progressNumber]}>
            {displayProgress}
          </Text>

          {/* Total/Percentage */}
          {showPercentage ? (
            <Text style={[styles.progressPercentage, getDimensionStyles(dimensions).progressPercentage]}>
              {Math.round(progressPercentage)}%
            </Text>
          ) : (
            <Text style={[styles.progressTotal, getDimensionStyles(dimensions).progressTotal]}>
              / {total}
            </Text>
          )}

          {/* Goal Indicator */}
          {goal && goal !== total && (
            <View style={styles.goalIndicator}>
              <MaterialIcons
                name="flag"
                size={dimensions.size < 120 ? 12 : 16}
                color={colors.warning}
              />
              <Text style={[styles.goalText, getDimensionStyles(dimensions).goalText]}>
                Goal: {goal}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Achievement Badges */}
      {achievements.length > 0 && (
        <Animated.View
          style={[
            styles.achievementsContainer,
            {
              opacity: animatedAchievements,
              transform: [
                {
                  scale: animatedAchievements.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {achievements.slice(0, 3).map((achievement, index) => (
            <TouchableOpacity
              key={achievement.id}
              style={[
                styles.achievementBadge,
                getDimensionStyles(dimensions).achievementBadge,
              ]}
              onPress={() => handleAchievementPress(achievement)}
              activeOpacity={0.8}
            >
              <Text style={[styles.achievementIcon, getDimensionStyles(dimensions).achievementIcon]}>
                {achievement.icon}
              </Text>
            </TouchableOpacity>
          ))}
          
          {achievements.length > 3 && (
            <View style={[styles.achievementBadge, styles.moreAchievements]}>
              <Text style={[styles.moreAchievementsText, getDimensionStyles(dimensions).achievementIcon]}>
                +{achievements.length - 3}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Milestone Markers */}
      {size !== 'small' && renderMilestoneMarkers(dimensions, radius, total, color)}
    </TouchableComponent>
  );
}

/**
 * Render milestone markers around the progress circle
 */
function renderMilestoneMarkers(
  dimensions: ReturnType<typeof getDimensions>,
  radius: number,
  total: number,
  color: string
) {
  const milestones = [25, 50, 75]; // Percentage milestones
  const centerX = dimensions.size / 2;
  const centerY = dimensions.size / 2;

  return (
    <Svg
      width={dimensions.size}
      height={dimensions.size}
      style={[styles.svg, StyleSheet.absoluteFill]}
    >
      {milestones.map((milestone) => {
        const angle = (milestone / 100) * 2 * Math.PI - Math.PI / 2; // Start from top
        const markerRadius = radius + 8;
        const x = centerX + Math.cos(angle) * markerRadius;
        const y = centerY + Math.sin(angle) * markerRadius;

        return (
          <Circle
            key={milestone}
            cx={x}
            cy={y}
            r={2}
            fill={color + '60'}
          />
        );
      })}
    </Svg>
  );
}

/**
 * Get dimensions based on size prop
 */
function getDimensions(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return {
        size: 80,
        strokeWidth: 6,
        fontSize: {
          number: 18,
          percentage: 10,
          total: 12,
          goal: 8,
          achievement: 12,
        },
      };
    case 'large':
      return {
        size: 160,
        strokeWidth: 12,
        fontSize: {
          number: 32,
          percentage: 16,
          total: 18,
          goal: 12,
          achievement: 20,
        },
      };
    case 'medium':
    default:
      return {
        size: 120,
        strokeWidth: 8,
        fontSize: {
          number: 24,
          percentage: 14,
          total: 16,
          goal: 10,
          achievement: 16,
        },
      };
  }
}

/**
 * Get dimension-specific styles
 */
function getDimensionStyles(dimensions: ReturnType<typeof getDimensions>) {
  return {
    width: dimensions.size,
    height: dimensions.size,
    progressNumber: {
      fontSize: dimensions.fontSize.number,
    },
    progressPercentage: {
      fontSize: dimensions.fontSize.percentage,
    },
    progressTotal: {
      fontSize: dimensions.fontSize.total,
    },
    goalText: {
      fontSize: dimensions.fontSize.goal,
    },
    achievementBadge: {
      width: dimensions.size < 100 ? 20 : 24,
      height: dimensions.size < 100 ? 20 : 24,
    },
    achievementIcon: {
      fontSize: dimensions.fontSize.achievement,
    },
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  svg: {
    position: 'absolute',
  },

  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },

  progressNumber: {
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },

  progressPercentage: {
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -spacing(0.5),
  },

  progressTotal: {
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -spacing(0.5),
  },

  goalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(0.5),
  },

  goalText: {
    fontWeight: fonts.weights.medium,
    color: colors.warning,
    marginLeft: spacing(0.25),
  },

  achievementsContainer: {
    flexDirection: 'row',
    marginTop: spacing(1),
    gap: spacing(0.5),
  },

  achievementBadge: {
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  achievementIcon: {
    textAlign: 'center',
  },

  moreAchievements: {
    backgroundColor: colors.accent,
  },

  moreAchievementsText: {
    color: colors.white,
    fontWeight: fonts.weights.bold,
  },
});