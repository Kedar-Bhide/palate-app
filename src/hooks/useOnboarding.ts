/**
 * Onboarding State Management Hook
 * Handles onboarding completion status and step navigation
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const ONBOARDING_DATA_KEY = 'onboarding_data';

export interface OnboardingData {
  displayName: string;
  username: string;
  profilePhoto?: string;
  cameraPermissionGranted: boolean;
  locationPermissionGranted: boolean;
  addedFriends: string[];
  currentStep: number;
}

const initialOnboardingData: OnboardingData = {
  displayName: '',
  username: '',
  profilePhoto: undefined,
  cameraPermissionGranted: false,
  locationPermissionGranted: false,
  addedFriends: [],
  currentStep: 1,
};

export const useOnboarding = () => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData);
  const [isLoading, setIsLoading] = useState(true);

  // Check onboarding completion status on hook initialization
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      setIsLoading(true);
      const [completedStatus, storedData] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY),
        AsyncStorage.getItem(ONBOARDING_DATA_KEY),
      ]);

      setIsOnboardingCompleted(completedStatus === 'true');
      
      if (storedData) {
        const parsedData: OnboardingData = JSON.parse(storedData);
        setOnboardingData(parsedData);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOnboardingData = async (updates: Partial<OnboardingData>) => {
    try {
      const newData = { ...onboardingData, ...updates };
      setOnboardingData(newData);
      await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error('Error updating onboarding data:', error);
    }
  };

  const nextStep = async () => {
    const newStep = Math.min(onboardingData.currentStep + 1, 5);
    await updateOnboardingData({ currentStep: newStep });
  };

  const previousStep = async () => {
    const newStep = Math.max(onboardingData.currentStep - 1, 1);
    await updateOnboardingData({ currentStep: newStep });
  };

  const goToStep = async (step: number) => {
    if (step >= 1 && step <= 5) {
      await updateOnboardingData({ currentStep: step });
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save user profile data to database (placeholder for actual implementation)
      const userProfile = {
        displayName: onboardingData.displayName,
        username: onboardingData.username,
        profilePhoto: onboardingData.profilePhoto,
        cameraPermissionGranted: onboardingData.cameraPermissionGranted,
        locationPermissionGranted: onboardingData.locationPermissionGranted,
        addedFriends: onboardingData.addedFriends,
      };
      
      console.log('Saving user profile:', userProfile);
      
      // TODO: Save to Supabase users table
      // await saveUserProfile(userProfile);
      
      // Mark onboarding as complete
      await Promise.all([
        AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true'),
        AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(onboardingData)),
      ]);
      
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      throw error;
    }
  };

  const resetOnboarding = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY),
        AsyncStorage.removeItem(ONBOARDING_DATA_KEY),
      ]);
      setIsOnboardingCompleted(false);
      setOnboardingData(initialOnboardingData);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      throw error;
    }
  };

  // Validation helpers
  const isUsernameValid = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const isDisplayNameValid = (displayName: string): boolean => {
    return displayName.trim().length >= 2 && displayName.trim().length <= 50;
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1: // Welcome screen
        return true;
      case 2: // Permissions screen
        return true; // Can proceed without permissions
      case 3: // Profile setup
        return isDisplayNameValid(onboardingData.displayName) && isUsernameValid(onboardingData.username);
      case 4: // Friend discovery
        return true; // Can always proceed (friends are optional)
      case 5: // First post encouragement 
        return true; // Final step, ready to complete
      default:
        return false;
    }
  };

  // Helper to add friends during onboarding
  const addFriend = async (friendId: string) => {
    const currentFriends = onboardingData.addedFriends || [];
    if (!currentFriends.includes(friendId)) {
      await updateOnboardingData({
        addedFriends: [...currentFriends, friendId],
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    const currentFriends = onboardingData.addedFriends || [];
    await updateOnboardingData({
      addedFriends: currentFriends.filter(id => id !== friendId),
    });
  };

  return {
    // State
    isOnboardingCompleted,
    onboardingData,
    isLoading,
    
    // Actions
    updateOnboardingData,
    nextStep,
    previousStep,
    goToStep,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    addFriend,
    removeFriend,
    
    // Utilities
    checkOnboardingStatus,
    isUsernameValid,
    isDisplayNameValid,
    canProceedFromStep,
    
    // Computed values
    currentStep: onboardingData.currentStep,
    totalSteps: 5,
  };
};