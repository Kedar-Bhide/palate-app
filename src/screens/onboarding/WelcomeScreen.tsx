/**
 * Welcome Screen - Onboarding Screen 1/5
 * App introduction and welcome message
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';
import { colors, spacing, fonts } from '../../theme/uiTheme';
import { useOnboarding } from '../../hooks/useOnboarding';

interface WelcomeScreenProps {
  onNext: () => void;
  onSkip: () => void;
  canProceed: boolean;
}

export default function WelcomeScreen({ onNext, onSkip }: WelcomeScreenProps) {
  const { currentStep, totalSteps } = useOnboarding();

  // Hero illustration component
  const HeroIllustration = () => (
    <View style={styles.heroContainer}>
      <View style={styles.iconContainer}>
        <MaterialIcons 
          name="restaurant" 
          size={80} 
          color={colors.primary} 
        />
      </View>
      <View style={styles.decorativeElements}>
        <View style={[styles.decorativeDot, styles.dot1]} />
        <View style={[styles.decorativeDot, styles.dot2]} />
        <View style={[styles.decorativeDot, styles.dot3]} />
      </View>
    </View>
  );

  // Main content component
  const WelcomeContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.description}>
        Discover, document, and share your culinary adventures with friends
      </Text>
      
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
          <Text style={styles.featureText}>Capture your meals</Text>
        </View>
        
        <View style={styles.featureItem}>
          <MaterialIcons name="people" size={24} color={colors.primary} />
          <Text style={styles.featureText}>Connect with friends</Text>
        </View>
        
        <View style={styles.featureItem}>
          <MaterialIcons name="explore" size={24} color={colors.primary} />
          <Text style={styles.featureText}>Discover new places</Text>
        </View>
      </View>
    </View>
  );

  return (
    <OnboardingSlide
      title="Welcome to Palate"
      subtitle="Every meal tells a story"
      illustration={<HeroIllustration />}
      content={<WelcomeContent />}
      primaryButton={{
        title: "Get Started",
        onPress: onNext,
      }}
      currentStep={currentStep}
      totalSteps={totalSteps}
    />
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    height: 200,
  },
  
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight + '20', // 20% opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  
  decorativeElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  
  decorativeDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
  },
  
  dot1: {
    top: 30,
    left: 40,
    opacity: 0.6,
  },
  
  dot2: {
    top: 60,
    right: 50,
    opacity: 0.4,
    backgroundColor: colors.primary,
  },
  
  dot3: {
    bottom: 40,
    left: 60,
    opacity: 0.3,
  },
  
  contentContainer: {
    paddingVertical: spacing(2),
  },
  
  description: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.5,
    marginBottom: spacing(4),
    paddingHorizontal: spacing(2),
  },
  
  featuresContainer: {
    gap: spacing(3),
  },
  
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    gap: spacing(2),
  },
  
  featureText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.medium,
    color: colors.text,
    flex: 1,
  },
});