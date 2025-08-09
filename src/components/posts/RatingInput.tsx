/**
 * RatingInput Component
 * 5-star rating component with interactive selection and animations
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';

interface RatingInputProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
  showClearButton?: boolean;
}

type RatingSize = 'small' | 'medium' | 'large';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const STAR_SIZES: Record<RatingSize, number> = {
  small: 20,
  medium: 28,
  large: 36,
};

const EMOJI_RATINGS = {
  1: '😞',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '😍',
};

export default function RatingInput({
  rating,
  onRatingChange,
  maxRating = 5,
  showLabels = true,
  size = 'medium',
  readonly = false,
  showClearButton = true,
}: RatingInputProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const scaleAnimations = useRef(
    Array.from({ length: maxRating }, () => new Animated.Value(1))
  ).current;

  const starSize = STAR_SIZES[size];
  const currentRating = hoveredRating || rating;

  // Animate star scale on press
  const animateStar = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnimations[index], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimations[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle star press
  const handleStarPress = async (starRating: number) => {
    if (readonly) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate the pressed star
    animateStar(starRating - 1);
    
    // Update rating (toggle off if same rating is pressed)
    const newRating = rating === starRating ? 0 : starRating;
    onRatingChange(newRating);
  };

  // Clear rating
  const handleClear = async () => {
    if (readonly) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRatingChange(0);
  };

  // Render star
  const renderStar = (starIndex: number) => {
    const starRating = starIndex + 1;
    const isFilled = starRating <= currentRating;
    const isHovered = starRating <= hoveredRating;
    
    return (
      <TouchableOpacity
        key={starIndex}
        onPress={() => handleStarPress(starRating)}
        onPressIn={() => !readonly && setHoveredRating(starRating)}
        onPressOut={() => !readonly && setHoveredRating(0)}
        style={styles.starButton}
        activeOpacity={readonly ? 1 : 0.7}
        disabled={readonly}
      >
        <Animated.View
          style={[
            styles.starContainer,
            { transform: [{ scale: scaleAnimations[starIndex] }] },
          ]}
        >
          <MaterialIcons
            name={isFilled || isHovered ? 'star' : 'star-outline'}
            size={starSize}
            color={
              isFilled || isHovered
                ? colors.warning
                : colors.outline
            }
            style={[
              styles.star,
              isHovered && !isFilled && styles.starHovered,
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Get rating label
  const getRatingLabel = () => {
    if (!showLabels || currentRating === 0) return null;
    
    const label = RATING_LABELS[currentRating as keyof typeof RATING_LABELS];
    const emoji = EMOJI_RATINGS[currentRating as keyof typeof EMOJI_RATINGS];
    
    return (
      <View style={styles.labelContainer}>
        <Text style={styles.emojiLabel}>{emoji}</Text>
        <Text style={styles.textLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stars Row */}
      <View style={styles.starsContainer}>
        <View style={styles.starsRow}>
          {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
        </View>
        
        {/* Clear Button */}
        {showClearButton && rating > 0 && !readonly && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <MaterialIcons name="clear" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Rating Label */}
      {getRatingLabel()}

      {/* Rating Counter */}
      {rating > 0 && (
        <Text style={styles.ratingCounter}>
          {rating} out of {maxRating} stars
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },

  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  starButton: {
    padding: spacing(1),
    alignItems: 'center',
    justifyContent: 'center',
  },

  starContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  star: {
    // Base star styles
  },

  starHovered: {
    opacity: 0.7,
  },

  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing(2),
    gap: spacing(1),
  },

  emojiLabel: {
    fontSize: fonts.lg,
  },

  textLabel: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
  },

  ratingCounter: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    marginTop: spacing(1),
  },
});