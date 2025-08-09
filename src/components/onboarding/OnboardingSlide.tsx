/**
 * OnboardingSlide Component
 * Reusable slide component for consistent onboarding layout with Instagram-style design
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fonts, radii } from '../../theme/uiTheme';
import Button from '../ui/Button';

interface OnboardingSlideProps {
  title: string;
  subtitle?: string;
  illustration?: React.ReactNode;
  content?: React.ReactNode;
  primaryButton?: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryButton?: {
    title: string;
    onPress: () => void;
  };
  currentStep: number;
  totalSteps: number;
  backgroundColor?: string;
}

export default function OnboardingSlide({
  title,
  subtitle,
  illustration,
  content,
  primaryButton,
  secondaryButton,
  currentStep,
  totalSteps,
  backgroundColor = colors.background,
}: OnboardingSlideProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animated entrance effect
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Progress indicator dots
  const renderProgressIndicator = () => {
    return (
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep - 1 ? styles.progressDotActive : styles.progressDotInactive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing(3) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        {renderProgressIndicator()}

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Hero Illustration Area */}
          {illustration && (
            <View style={styles.illustrationContainer}>
              {illustration}
            </View>
          )}

          {/* Title and Subtitle */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          {/* Content Area */}
          {content && (
            <View style={styles.contentContainer}>
              {content}
            </View>
          )}

          {/* Button Area */}
          <View style={styles.buttonContainer}>
            {primaryButton && (
              <Button
                variant="primary"
                size="large"
                onPress={primaryButton.onPress}
                loading={primaryButton.loading}
                disabled={primaryButton.disabled}
                style={styles.primaryButton}
              >
                {primaryButton.title}
              </Button>
            )}

            {secondaryButton && (
              <Button
                variant="text"
                size="large"
                onPress={secondaryButton.onPress}
                style={styles.secondaryButton}
              >
                {secondaryButton.title}
              </Button>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing(3),
  },
  
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(3),
    gap: spacing(1),
  },
  
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24, // Elongated active dot
    borderRadius: 4,
  },
  
  progressDotInactive: {
    backgroundColor: colors.outline,
  },
  
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(4),
    minHeight: 200,
  },
  
  textContainer: {
    alignItems: 'center',
    paddingVertical: spacing(2),
  },
  
  title: {
    fontSize: fonts.xxxl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
    lineHeight: fonts.xxxl * 1.2,
  },
  
  subtitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.lg * 1.4,
    maxWidth: '80%',
  },
  
  contentContainer: {
    flex: 1,
    paddingVertical: spacing(2),
    justifyContent: 'center',
  },
  
  buttonContainer: {
    paddingTop: spacing(3),
    gap: spacing(2),
  },
  
  primaryButton: {
    width: '100%',
  },
  
  secondaryButton: {
    width: '100%',
  },
});