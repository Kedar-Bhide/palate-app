/**
 * OnboardingFlow Container
 * Main onboarding container with smooth slide transitions and navigation management
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useOnboarding } from '../../hooks/useOnboarding';

// Import onboarding screens
import WelcomeScreen from './WelcomeScreen';
import PermissionsScreen from './PermissionsScreen';
import UsernameSetupScreen from './UsernameSetupScreen';
import FindFriendsScreen from './FindFriendsScreen';
import FirstPostScreen from './FirstPostScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const {
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    completeOnboarding,
    skipOnboarding,
    canProceedFromStep,
  } = useOnboarding();

  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Handle step navigation with smooth transitions
  const navigateToStep = (targetStep: number) => {
    const direction = targetStep > currentStep ? -1 : 1;
    
    // Slide out animation
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction * SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset position and slide in
      translateX.setValue(-direction * SCREEN_WIDTH);
      
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Handle next step
  const handleNext = async () => {
    if (currentStep < totalSteps) {
      if (canProceedFromStep(currentStep)) {
        navigateToStep(currentStep + 1);
        await nextStep();
      }
    } else {
      // Complete onboarding
      await completeOnboarding();
      onComplete();
    }
  };

  // Handle previous step
  const handlePrevious = async () => {
    if (currentStep > 1) {
      navigateToStep(currentStep - 1);
      await previousStep();
    }
  };

  // Handle skip onboarding
  const handleSkip = async () => {
    try {
      await skipOnboarding();
      onSkip?.() || onComplete();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  // Handle onboarding completion for final step
  const handleComplete = async () => {
    try {
      await completeOnboarding();
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Pan responder for swipe gestures (optional)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 100;
      },
      onPanResponderMove: (_, gestureState) => {
        // Optional: Add real-time swipe feedback
        translateX.setValue(gestureState.dx * 0.3);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = SCREEN_WIDTH * 0.3;
        
        if (gestureState.dx > threshold && currentStep > 1) {
          // Swipe right - go to previous step
          handlePrevious();
        } else if (gestureState.dx < -threshold && currentStep < totalSteps && canProceedFromStep(currentStep)) {
          // Swipe left - go to next step
          handleNext();
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Render current screen based on step
  const renderCurrentScreen = () => {
    const screenProps = {
      onNext: handleNext,
      onPrevious: handlePrevious,
      onSkip: handleSkip,
      onComplete: handleComplete,
      canProceed: canProceedFromStep(currentStep),
    };

    switch (currentStep) {
      case 1:
        return <WelcomeScreen {...screenProps} />;
      case 2:
        return <PermissionsScreen {...screenProps} />;
      case 3:
        return <UsernameSetupScreen {...screenProps} />;
      case 4:
        return <FindFriendsScreen {...screenProps} />;
      case 5:
        return <FirstPostScreen {...screenProps} />;
      default:
        return <WelcomeScreen {...screenProps} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.container} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.screenContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX }],
            },
          ]}
        >
          {renderCurrentScreen()}
        </Animated.View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  screenContainer: {
    flex: 1,
  },
});