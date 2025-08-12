/**
 * EmptyFeedState Component
 * Different empty states for various feed scenarios with encouraging messages
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, fonts } from '../../theme/uiTheme';
import Button from '../ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type EmptyStateType = 'new-user' | 'no-friends' | 'no-posts' | 'error' | 'filtered' | 'offline';

interface EmptyFeedStateProps {
  type: EmptyStateType;
  onActionPress?: () => void;
  actionText?: string;
  title?: string;
  description?: string;
  showSecondaryAction?: boolean;
  onSecondaryActionPress?: () => void;
  secondaryActionText?: string;
  style?: any;
}

const EmptyFeedState: React.FC<EmptyFeedStateProps> = ({
  type,
  onActionPress,
  actionText,
  title,
  description,
  showSecondaryAction = false,
  onSecondaryActionPress,
  secondaryActionText,
  style,
}) => {
  // Get default content based on type
  const getDefaultContent = useCallback(() => {
    switch (type) {
      case 'new-user':
        return {
          icon: 'waving-hand' as const,
          iconColor: colors.warning,
          title: 'Welcome to Palate! 👋',
          description: 'Start following friends to see their delicious food adventures, or be the first to share yours!',
          actionText: 'Find Friends',
          secondaryActionText: 'Create First Post',
        };
      
      case 'no-friends':
        return {
          icon: 'people-outline' as const,
          iconColor: colors.info,
          title: 'Find Food-Loving Friends',
          description: 'Connect with friends who love food as much as you do! Follow them to see their restaurant discoveries and meal reviews.',
          actionText: 'Discover Friends',
          secondaryActionText: 'Share a Post',
        };
      
      case 'no-posts':
        return {
          icon: 'restaurant' as const,
          iconColor: colors.primary,
          title: 'Your Feed is Quiet',
          description: 'Your friends haven\'t posted any food adventures lately. Why not be the first to share a delicious meal?',
          actionText: 'Create Post',
          secondaryActionText: 'Refresh Feed',
        };
      
      case 'filtered':
        return {
          icon: 'search-off' as const,
          iconColor: colors.textSecondary,
          title: 'No Posts Match Your Filters',
          description: 'Try adjusting your filters or explore different cuisines and restaurants to discover new food experiences.',
          actionText: 'Clear Filters',
          secondaryActionText: 'Browse All Posts',
        };
      
      case 'offline':
        return {
          icon: 'wifi-off' as const,
          iconColor: colors.error,
          title: 'You\'re Offline',
          description: 'Check your internet connection to see the latest food posts from your friends and discover new restaurants.',
          actionText: 'Try Again',
          secondaryActionText: 'View Saved Posts',
        };
      
      case 'error':
      default:
        return {
          icon: 'error-outline' as const,
          iconColor: colors.error,
          title: 'Something Went Wrong',
          description: 'We couldn\'t load your feed right now. Please check your connection and try again.',
          actionText: 'Try Again',
          secondaryActionText: 'Contact Support',
        };
    }
  }, [type]);

  const defaultContent = getDefaultContent();

  // Handle primary action
  const handleActionPress = useCallback(async () => {
    if (!onActionPress) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onActionPress();
  }, [onActionPress]);

  // Handle secondary action
  const handleSecondaryActionPress = useCallback(async () => {
    if (!onSecondaryActionPress) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSecondaryActionPress();
  }, [onSecondaryActionPress]);

  // Render illustration based on type
  const renderIllustration = () => {
    const iconSize = type === 'new-user' ? 72 : 64;
    
    return (
      <View style={styles.illustrationContainer}>
        <View style={[styles.iconCircle, { backgroundColor: `${defaultContent.iconColor}15` }]}>
          <MaterialIcons
            name={defaultContent.icon}
            size={iconSize}
            color={defaultContent.iconColor}
          />
        </View>
        
        {type === 'new-user' && (
          <View style={styles.sparkles}>
            <View style={[styles.sparkle, styles.sparkle1]}>
              <Text style={styles.sparkleText}>✨</Text>
            </View>
            <View style={[styles.sparkle, styles.sparkle2]}>
              <Text style={styles.sparkleText}>🍽️</Text>
            </View>
            <View style={[styles.sparkle, styles.sparkle3]}>
              <Text style={styles.sparkleText}>👥</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render quick tips based on type
  const renderQuickTips = () => {
    if (type !== 'new-user') return null;

    return (
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Quick Tips:</Text>
        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>📸</Text>
            <Text style={styles.tipText}>Share photos of your favorite meals</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>⭐</Text>
            <Text style={styles.tipText}>Rate restaurants to help friends discover gems</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>👥</Text>
            <Text style={styles.tipText}>Follow friends to see their food adventures</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Illustration */}
      {renderIllustration()}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>
          {title || defaultContent.title}
        </Text>
        
        <Text style={styles.description}>
          {description || defaultContent.description}
        </Text>

        {/* Quick Tips (for new users) */}
        {renderQuickTips()}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {/* Primary Action */}
        {onActionPress && (
          <Button
            title={actionText || defaultContent.actionText}
            onPress={handleActionPress}
            variant="filled"
            size="lg"
            style={styles.primaryButton}
          />
        )}

        {/* Secondary Action */}
        {(showSecondaryAction || type === 'new-user') && onSecondaryActionPress && (
          <Button
            title={secondaryActionText || defaultContent.secondaryActionText}
            onPress={handleSecondaryActionPress}
            variant="outlined"
            size="md"
            style={styles.secondaryButton}
          />
        )}
      </View>

      {/* Footer Message for specific types */}
      {(type === 'new-user' || type === 'no-friends') && (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {type === 'new-user' 
              ? "Welcome to the Palate community! 🎉"
              : "Great food experiences are better when shared! 🤝"}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(8),
    backgroundColor: colors.background,
  },

  // Illustration
  illustrationContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: spacing(6),
  },

  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  sparkles: {
    position: 'absolute',
    width: 160,
    height: 160,
  },

  sparkle: {
    position: 'absolute',
  },

  sparkle1: {
    top: 10,
    right: 10,
  },

  sparkle2: {
    bottom: 20,
    left: 0,
  },

  sparkle3: {
    top: 40,
    left: -10,
  },

  sparkleText: {
    fontSize: 20,
  },

  // Content
  content: {
    alignItems: 'center',
    marginBottom: spacing(6),
  },

  title: {
    fontSize: fonts.xxl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(3),
    lineHeight: fonts.xxl * 1.2,
  },

  description: {
    fontSize: fonts.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.lg * 1.4,
    maxWidth: SCREEN_WIDTH * 0.8,
  },

  // Tips
  tipsContainer: {
    marginTop: spacing(4),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: colors.primaryContainer,
    borderRadius: 16,
    width: '100%',
  },

  tipsTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
    marginBottom: spacing(2),
    textAlign: 'center',
  },

  tipsList: {
    gap: spacing(2),
  },

  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },

  tipBullet: {
    fontSize: fonts.base,
    width: 24,
  },

  tipText: {
    fontSize: fonts.sm,
    color: colors.text,
    flex: 1,
    lineHeight: fonts.sm * 1.3,
  },

  // Actions
  actionsContainer: {
    width: '100%',
    gap: spacing(3),
    alignItems: 'center',
  },

  primaryButton: {
    width: '100%',
    minHeight: 50,
  },

  secondaryButton: {
    width: '80%',
  },

  // Footer
  footerContainer: {
    marginTop: spacing(4),
    paddingTop: spacing(4),
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    width: '100%',
  },

  footerText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default EmptyFeedState;