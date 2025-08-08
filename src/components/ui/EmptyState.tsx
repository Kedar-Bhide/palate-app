import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { theme } from '../../theme';
import Button, { ButtonProps } from './Button';

export interface EmptyStateAction extends Omit<ButtonProps, 'children'> {
  title: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  animated?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  style,
  titleStyle,
  descriptionStyle,
  animated = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animation.duration.slow,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: theme.animation.duration.slow,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      translateYAnim.setValue(0);
    }
  }, [animated, fadeAnim, translateYAnim]);

  const animatedStyle = animated
    ? {
        opacity: fadeAnim,
        transform: [{ translateY: translateYAnim }],
      }
    : {};

  return (
    <Animated.View
      style={[styles.container, animatedStyle, style]}
      accessibilityLabel={`Empty state: ${title}`}
    >
      {icon && (
        <View
          style={styles.iconContainer}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {icon}
        </View>
      )}

      <View style={styles.contentContainer}>
        <Text
          style={[styles.title, titleStyle]}
        >
          {title}
        </Text>

        {description && (
          <Text
            style={[styles.description, descriptionStyle]}
          >
            {description}
          </Text>
        )}
      </View>

      {(action || secondaryAction) && (
        <View style={styles.actionContainer}>
          {action && (
            <Button
              variant={action.variant || 'primary'}
              size={action.size || 'medium'}
              fullWidth={action.fullWidth}
              onPress={action.onPress}
              style={[styles.primaryAction, action.style]}
              accessibilityHint="Tap to take action on this empty state"
              {...action}
            >
              {action.title}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'ghost'}
              size={secondaryAction.size || 'medium'}
              fullWidth={secondaryAction.fullWidth}
              onPress={secondaryAction.onPress}
              style={[
                action ? styles.secondaryAction : styles.primaryAction,
                secondaryAction.style,
              ]}
              accessibilityHint="Tap for secondary action on this empty state"
              {...secondaryAction}
            >
              {secondaryAction.title}
            </Button>
          )}
        </View>
      )}
    </Animated.View>
  );
};

export interface EmptyFeedProps extends Omit<EmptyStateProps, 'title' | 'description'> {
  feedType?: 'posts' | 'photos' | 'recipes' | 'restaurants' | 'reviews';
}

export const EmptyFeed: React.FC<EmptyFeedProps> = ({
  feedType = 'posts',
  ...props
}) => {
  const getFeedContent = () => {
    switch (feedType) {
      case 'photos':
        return {
          title: 'No photos yet',
          description: 'Start sharing your food adventures!',
        };
      case 'recipes':
        return {
          title: 'No recipes saved',
          description: 'Discover and save delicious recipes to cook later.',
        };
      case 'restaurants':
        return {
          title: 'No restaurants found',
          description: 'Try adjusting your search or explore new areas.',
        };
      case 'reviews':
        return {
          title: 'No reviews yet',
          description: 'Share your thoughts about restaurants and dishes.',
        };
      case 'posts':
      default:
        return {
          title: 'No posts to show',
          description: 'Follow friends or explore trending content.',
        };
    }
  };

  const content = getFeedContent();

  return (
    <EmptyState
      title={content.title}
      description={content.description}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    maxWidth: 300,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.fontSize['2xl'] * theme.typography.lineHeight.tight,
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.normal,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  primaryAction: {
    marginBottom: theme.spacing.md,
  },
  secondaryAction: {
    marginTop: 0,
  },
});

export default EmptyState;