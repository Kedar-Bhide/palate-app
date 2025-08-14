import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Achievement } from '../../types/cuisine';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: number; // 0-1 for partial completion
  onPress: () => void;
  showProgress?: boolean;
  size?: 'small' | 'medium' | 'large';
  showCelebration?: boolean;
  animated?: boolean;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export default function AchievementBadge({
  achievement,
  isUnlocked,
  progress = 0,
  onPress,
  showProgress = true,
  size = 'medium',
  showCelebration = false,
  animated = true,
  tier,
}: AchievementBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  const badgeSize = getBadgeSize(size);
  const badgeTier = tier || achievement.tier || determineTier(achievement.threshold);
  const tierColors = getTierColors(badgeTier);
  const progressPercentage = achievement.threshold > 0 ? Math.min((progress / achievement.threshold) * 100, 100) : progress * 100;
  const isLocked = !isUnlocked && progress < 1;

  useEffect(() => {
    if (showCelebration && isUnlocked) {
      // Celebration animation sequence
      Animated.sequence([
        Animated.timing(celebrationAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.7)),
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow effect for unlocked achievements
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [showCelebration, isUnlocked]);

  const handlePress = () => {
    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const celebrationScale = celebrationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <TouchableOpacity
      style={[styles.container, { width: badgeSize, height: badgeSize }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Glow effect for unlocked achievements */}
      {isUnlocked && (
        <Animated.View
          style={[
            styles.glowContainer,
            {
              width: badgeSize + 8,
              height: badgeSize + 8,
              borderRadius: (badgeSize + 8) / 2,
              backgroundColor: tierColors.primary,
              opacity: glowOpacity,
            },
          ]}
        />
      )}

      {/* Progress ring */}
      {showProgress && !isUnlocked && progress > 0 && (
        <View style={[styles.progressRing, { width: badgeSize, height: badgeSize }]}>
          <View
            style={[
              styles.progressArc,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                borderColor: tierColors.primary,
                transform: [{ rotate: `${(progressPercentage * 3.6) - 90}deg` }],
              },
            ]}
          />
        </View>
      )}

      {/* Main badge */}
      <Animated.View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: isUnlocked ? tierColors.primary : colors.surfaceVariant,
            borderColor: isUnlocked ? tierColors.border : colors.outline,
            transform: [
              { scale: scaleAnim },
              { scale: celebrationScale },
            ],
          },
          isUnlocked ? styles.unlockedShadow : styles.lockedShadow,
        ]}
      >
        {/* Badge content */}
        <View style={styles.badgeContent}>
          {isUnlocked ? (
            <>
              <Text style={[styles.icon, getIconSize(size)]}>
                {achievement.icon}
              </Text>
              {size !== 'small' && (
                <Text style={[styles.badgeText, { color: tierColors.text }]} numberOfLines={1}>
                  {achievement.name}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.lockIcon, getIconSize(size)]}>
                🔒
              </Text>
              {size !== 'small' && showProgress && (
                <Text style={styles.progressText}>
                  {Math.round(progressPercentage)}%
                </Text>
              )}
            </>
          )}
        </View>

        {/* Rarity indicator */}
        {isUnlocked && achievement.rarity && achievement.rarity !== 'common' && (
          <View style={[styles.rarityIndicator, { backgroundColor: getRarityColor(achievement.rarity) }]}>
            <Text style={styles.rarityText}>
              {getRaritySymbol(achievement.rarity)}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Celebration particles */}
      {showCelebration && isUnlocked && (
        <View style={styles.celebrationContainer}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  transform: [
                    {
                      translateX: celebrationAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.cos((index * 60) * Math.PI / 180) * 30],
                      }),
                    },
                    {
                      translateY: celebrationAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.sin((index * 60) * Math.PI / 180) * 30],
                      }),
                    },
                  ],
                  opacity: celebrationAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function getBadgeSize(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small': return 60;
    case 'large': return 100;
    case 'medium':
    default: return 80;
  }
}

function getIconSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small': return { fontSize: 20 };
    case 'large': return { fontSize: 32 };
    case 'medium':
    default: return { fontSize: 24 };
  }
}

function getTierColors(tier?: 'bronze' | 'silver' | 'gold' | 'platinum') {
  switch (tier) {
    case 'bronze':
      return {
        primary: '#CD7F32',
        border: '#B8722C',
        text: colors.white,
      };
    case 'silver':
      return {
        primary: '#C0C0C0',
        border: '#A8A8A8',
        text: colors.text,
      };
    case 'gold':
      return {
        primary: '#FFD700',
        border: '#E6C200',
        text: colors.text,
      };
    case 'platinum':
      return {
        primary: '#E5E4E2',
        border: '#CDCCCA',
        text: colors.text,
      };
    default:
      return {
        primary: colors.primary,
        border: colors.primaryDark,
        text: colors.white,
      };
  }
}

function getRarityColor(rarity: 'common' | 'rare' | 'epic' | 'legendary'): string {
  switch (rarity) {
    case 'rare': return '#0099FF';
    case 'epic': return '#9966CC';
    case 'legendary': return '#FF8000';
    default: return colors.primary;
  }
}

function getRaritySymbol(rarity: 'common' | 'rare' | 'epic' | 'legendary'): string {
  switch (rarity) {
    case 'rare': return '★';
    case 'epic': return '♦';
    case 'legendary': return '♛';
    default: return '';
  }
}

function determineTier(threshold: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (threshold >= 100) return 'platinum';
  if (threshold >= 50) return 'gold';
  if (threshold >= 10) return 'silver';
  return 'bronze';
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing(0.5),
  },

  glowContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    zIndex: 0,
  },

  progressRing: {
    position: 'absolute',
    zIndex: 1,
  },

  progressArc: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
  },

  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },

  unlockedShadow: {
    ...shadows.medium,
  },

  lockedShadow: {
    ...shadows.small,
    opacity: 0.6,
  },

  badgeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  icon: {
    textAlign: 'center',
    marginBottom: spacing(0.25),
  },

  lockIcon: {
    textAlign: 'center',
    opacity: 0.5,
  },

  badgeText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    textAlign: 'center',
    paddingHorizontal: spacing(0.25),
  },

  progressText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  tierIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 3,
    ...shadows.small,
  },

  rarityIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },

  rarityText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: fonts.weights.bold,
  },

  celebrationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 4,
  },

  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});