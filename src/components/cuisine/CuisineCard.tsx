import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Cuisine, UserCuisineProgress } from '../../types/cuisine';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface CuisineCardProps {
  cuisine: Cuisine;
  userProgress?: UserCuisineProgress;
  onPress: (cuisine: Cuisine) => void;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function CuisineCard({
  cuisine,
  userProgress,
  onPress,
  showDetails = true,
  size = 'medium',
}: CuisineCardProps) {
  const isTriedCuisine = !!userProgress;
  const cardSize = getCardSize(size);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, cardSize, isTriedCuisine ? styles.triedCard : styles.untriedCard]}
      onPress={() => onPress(cuisine)}
      activeOpacity={0.8}
    >
      {/* Cuisine Emoji */}
      <View style={styles.emojiContainer}>
        <Text style={[styles.emoji, getEmojiSize(size)]}>
          {cuisine.emoji}
        </Text>
        {isTriedCuisine && (
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </View>

      {/* Cuisine Info */}
      <View style={styles.infoContainer}>
        <Text 
          style={[styles.cuisineName, isTriedCuisine ? styles.triedText : styles.untriedText]}
          numberOfLines={1}
        >
          {cuisine.name}
        </Text>
        
        <Text style={styles.category} numberOfLines={1}>
          {cuisine.category}
        </Text>

        {showDetails && isTriedCuisine && userProgress && (
          <View style={styles.progressDetails}>
            <Text style={styles.triedDate}>
              First tried: {formatDate(userProgress.first_tried_at)}
            </Text>
            
            {userProgress.times_tried > 1 && (
              <Text style={styles.timesTriedBadge}>
                {userProgress.times_tried}x
              </Text>
            )}
            
            {userProgress.favorite_restaurant && (
              <Text style={styles.favoriteRestaurant} numberOfLines={1}>
                Favorite: {userProgress.favorite_restaurant}
              </Text>
            )}
          </View>
        )}

        {showDetails && !isTriedCuisine && (
          <View style={styles.untriedPrompt}>
            <Text style={styles.tryThisText}>Try this cuisine! 🌟</Text>
          </View>
        )}
      </View>

      {/* Achievement Badge */}
      {isTriedCuisine && userProgress?.times_tried && userProgress.times_tried >= 5 && (
        <View style={styles.achievementBadge}>
          <Text style={styles.achievementText}>Expert</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getCardSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return { minHeight: 120, padding: spacing(1) };
    case 'large':
      return { minHeight: 180, padding: spacing(2) };
    case 'medium':
    default:
      return { minHeight: 150, padding: spacing(1.5) };
  }
}

function getEmojiSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return { fontSize: 32 };
    case 'large':
      return { fontSize: 48 };
    case 'medium':
    default:
      return { fontSize: 40 };
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    marginVertical: spacing(0.5),
    marginHorizontal: spacing(0.5),
    position: 'relative',
    flex: 1,
    ...shadows.small,
  },
  
  triedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  
  untriedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.outline,
    opacity: 0.8,
  },

  emojiContainer: {
    alignItems: 'center',
    marginBottom: spacing(1),
    position: 'relative',
  },

  emoji: {
    textAlign: 'center',
  },

  checkmarkContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },

  infoContainer: {
    flex: 1,
    alignItems: 'center',
  },

  cuisineName: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    textAlign: 'center',
    marginBottom: spacing(0.25),
  },

  triedText: {
    color: colors.text,
  },

  untriedText: {
    color: colors.textSecondary,
  },

  category: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  progressDetails: {
    alignItems: 'center',
    marginTop: spacing(0.5),
  },

  triedDate: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing(0.25),
  },

  timesTriedBadge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontSize: fonts.xs,
    fontWeight: fonts.weights.semibold,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.25),
    borderRadius: radii.full,
    marginBottom: spacing(0.25),
    overflow: 'hidden',
  },

  favoriteRestaurant: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  untriedPrompt: {
    marginTop: spacing(0.5),
    paddingVertical: spacing(0.5),
  },

  tryThisText: {
    fontSize: fonts.xs,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: fonts.weights.medium,
  },

  achievementBadge: {
    position: 'absolute',
    top: spacing(0.5),
    right: spacing(0.5),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(0.5),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },

  achievementText: {
    fontSize: fonts.xs,
    color: colors.white,
    fontWeight: fonts.weights.semibold,
  },
});