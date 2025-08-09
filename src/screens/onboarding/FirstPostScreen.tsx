/**
 * First Post Screen - Onboarding Screen 5/5
 * Final onboarding screen with encouragement to start logging meals
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';
import { colors, spacing, fonts, radii } from '../../theme/uiTheme';
import { useOnboarding } from '../../hooks/useOnboarding';

interface FirstPostScreenProps {
  onComplete: () => void;
  onSkip: () => void;
  canProceed: boolean;
}

export default function FirstPostScreen({ 
  onComplete, 
  onSkip 
}: FirstPostScreenProps) {
  const { currentStep, totalSteps } = useOnboarding();

  // Hero illustration with camera and food elements
  const CameraHeroIllustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.cameraContainer}>
        <MaterialIcons name="camera-alt" size={64} color={colors.primary} />
        <View style={styles.cameraFlash} />
      </View>

      {/* Food elements around camera */}
      <View style={styles.foodElements}>
        {/* Fork and knife */}
        <View style={[styles.utensil, styles.fork]}>
          <MaterialIcons name="restaurant" size={20} color={colors.secondary} />
        </View>
        
        {/* Pizza slice */}
        <View style={[styles.foodIcon, styles.pizza]}>
          <Text style={styles.foodEmoji}>🍕</Text>
        </View>
        
        {/* Coffee cup */}
        <View style={[styles.foodIcon, styles.coffee]}>
          <Text style={styles.foodEmoji}>☕</Text>
        </View>
        
        {/* Heart for likes */}
        <View style={[styles.reactionIcon, styles.heart]}>
          <MaterialIcons name="favorite" size={16} color={colors.error} />
        </View>
      </View>

      {/* Sparkles for celebration */}
      <View style={styles.celebration}>
        <View style={[styles.sparkle, styles.sparkle1]}>✨</View>
        <View style={[styles.sparkle, styles.sparkle2]}>✨</View>
        <View style={[styles.sparkle, styles.sparkle3]}>✨</View>
      </View>
    </View>
  );

  // Content with navigation guide and encouragement
  const FirstPostContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.description}>
        Tap the camera button anytime to share your food adventures
      </Text>

      {/* Visual guide showing camera tab location */}
      <View style={styles.guideContainer}>
        <View style={styles.tabBarPreview}>
          {/* Mock tab bar icons */}
          <View style={styles.tabIcon}>
            <MaterialIcons name="home" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.tabIcon}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
          </View>
          
          {/* Highlighted camera tab */}
          <View style={[styles.tabIcon, styles.cameraTab]}>
            <MaterialIcons name="add-a-photo" size={24} color={colors.primary} />
            <View style={styles.cameraHighlight} />
          </View>
          
          <View style={styles.tabIcon}>
            <MaterialIcons name="notifications" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.tabIcon}>
            <MaterialIcons name="person" size={20} color={colors.textMuted} />
          </View>
        </View>
        
        <Text style={styles.guideText}>
          Look for the camera icon in your bottom navigation
        </Text>
      </View>

      {/* Encouragement section */}
      <View style={styles.encouragementContainer}>
        <View style={styles.featureHighlight}>
          <MaterialIcons name="photo-library" size={24} color={colors.primary} />
          <Text style={styles.featureText}>Capture every delicious moment</Text>
        </View>
        
        <View style={styles.featureHighlight}>
          <MaterialIcons name="location-on" size={24} color={colors.secondary} />
          <Text style={styles.featureText}>Remember where you found great food</Text>
        </View>
        
        <View style={styles.featureHighlight}>
          <MaterialIcons name="people" size={24} color={colors.success} />
          <Text style={styles.featureText}>Share discoveries with friends</Text>
        </View>
      </View>
    </View>
  );

  return (
    <OnboardingSlide
      title="You're all set!"
      subtitle="Ready to log your first meal?"
      illustration={<CameraHeroIllustration />}
      content={<FirstPostContent />}
      primaryButton={{
        title: "Start Exploring",
        onPress: onComplete,
      }}
      secondaryButton={{
        title: "I'll explore first",
        onPress: onSkip,
      }}
      currentStep={currentStep}
      totalSteps={totalSteps}
    />
  );
}

const styles = StyleSheet.create({
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
    position: 'relative',
  },

  cameraContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  cameraFlash: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.warning,
    opacity: 0.8,
  },

  foodElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  utensil: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  fork: {
    top: 20,
    left: 20,
  },

  foodIcon: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pizza: {
    top: 30,
    right: 25,
  },

  coffee: {
    bottom: 30,
    left: 30,
  },

  foodEmoji: {
    fontSize: 20,
  },

  reactionIcon: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  heart: {
    bottom: 20,
    right: 30,
  },

  celebration: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  sparkle: {
    position: 'absolute',
    fontSize: 16,
  },

  sparkle1: {
    top: 10,
    right: 60,
    transform: [{ rotate: '15deg' }],
  },

  sparkle2: {
    top: 50,
    left: 10,
    transform: [{ rotate: '-20deg' }],
  },

  sparkle3: {
    bottom: 10,
    right: 10,
    transform: [{ rotate: '45deg' }],
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

  guideContainer: {
    alignItems: 'center',
    marginBottom: spacing(4),
    paddingHorizontal: spacing(3),
  },

  tabBarPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radii.button,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderWidth: 1,
    borderColor: colors.outline,
    width: '100%',
    maxWidth: 280,
  },

  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  cameraTab: {
    transform: [{ scale: 1.1 }],
  },

  cameraHighlight: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.3,
  },

  guideText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing(2),
  },

  encouragementContainer: {
    gap: spacing(2.5),
    paddingHorizontal: spacing(3),
  },

  featureHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    gap: spacing(2),
  },

  featureText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.text,
    flex: 1,
    lineHeight: fonts.base * 1.4,
  },
});