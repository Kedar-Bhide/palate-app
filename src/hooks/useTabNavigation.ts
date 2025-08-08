import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';

// Conditional import for haptics with fallback
let Haptics: any = null;
try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics = require('expo-haptics').Haptics;
  }
} catch (error) {
  console.log('Haptics not available, continuing without haptic feedback');
}

export interface TabNavigationState {
  activeTab: keyof TabParamList;
  previousTab: keyof TabParamList | null;
  isTransitioning: boolean;
}

export interface UseTabNavigationProps {
  navigation: BottomTabNavigationProp<TabParamList>;
  initialTab?: keyof TabParamList;
}

export const useTabNavigation = ({ navigation, initialTab = 'Home' }: UseTabNavigationProps) => {
  const [navigationState, setNavigationState] = useState<TabNavigationState>({
    activeTab: initialTab,
    previousTab: null,
    isTransitioning: false,
  });

  const [badgeCounts, setBadgeCounts] = useState({
    Home: 0,
    MyPosts: 0,
    Camera: 0,
    Discover: 0,
    Profile: 0,
  });

  // Handle haptic feedback
  const triggerHapticFeedback = useCallback(() => {
    try {
      if (Haptics && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.log('Haptic feedback failed:', error);
    }
  }, []);

  // Navigate to tab with analytics and haptics
  const navigateToTab = useCallback((
    tabName: keyof TabParamList,
    options?: { withHaptic?: boolean; skipAnimation?: boolean }
  ) => {
    const { withHaptic = true, skipAnimation = false } = options || {};

    if (navigationState.activeTab === tabName) {
      // If already on the tab, scroll to top or refresh
      handleTabDoublePress(tabName);
      return;
    }

    // Trigger haptic feedback
    if (withHaptic) {
      triggerHapticFeedback();
    }

    // Update navigation state
    setNavigationState(prev => ({
      activeTab: tabName,
      previousTab: prev.activeTab,
      isTransitioning: true,
    }));

    // Navigate with optional animation control
    navigation.navigate(tabName);

    // Analytics tracking (placeholder for future implementation)
    console.log('Tab Navigation:', {
      from: navigationState.activeTab,
      to: tabName,
      timestamp: new Date().toISOString(),
    });

    // Reset transition state after animation
    setTimeout(() => {
      setNavigationState(prev => ({
        ...prev,
        isTransitioning: false,
      }));
    }, 300);
  }, [navigation, navigationState.activeTab, triggerHapticFeedback]);

  // Handle double press on active tab
  const handleTabDoublePress = useCallback((tabName: keyof TabParamList) => {
    console.log('Tab Double Press:', tabName);
    
    // Tab-specific double press actions
    switch (tabName) {
      case 'Home':
        // Scroll to top and refresh feed
        console.log('Refreshing home feed');
        break;
      case 'MyPosts':
        // Scroll to top
        console.log('Scrolling to top of posts');
        break;
      case 'Camera':
        // Quick capture
        console.log('Quick camera capture');
        break;
      case 'Discover':
        // Clear search and scroll to top
        console.log('Clearing search and scrolling to top');
        break;
      case 'Profile':
        // Scroll to top
        console.log('Scrolling to top of profile');
        break;
    }
  }, []);

  // Update badge count for a specific tab
  const updateBadgeCount = useCallback((tabName: keyof TabParamList, count: number) => {
    setBadgeCounts(prev => ({
      ...prev,
      [tabName]: count,
    }));
  }, []);

  // Clear badge for a specific tab
  const clearBadge = useCallback((tabName: keyof TabParamList) => {
    updateBadgeCount(tabName, 0);
  }, [updateBadgeCount]);

  // Get badge count for a specific tab
  const getBadgeCount = useCallback((tabName: keyof TabParamList): number => {
    return badgeCounts[tabName];
  }, [badgeCounts]);

  // Listen to navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const currentRoute = e.data.state?.routes[e.data.state?.index];
      if (currentRoute?.name) {
        setNavigationState(prev => ({
          activeTab: currentRoute.name as keyof TabParamList,
          previousTab: prev.activeTab,
          isTransitioning: false,
        }));
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Check if a specific tab is active
  const isTabActive = useCallback((tabName: keyof TabParamList): boolean => {
    return navigationState.activeTab === tabName;
  }, [navigationState.activeTab]);

  // Get tab press handler
  const getTabPressHandler = useCallback((tabName: keyof TabParamList) => {
    return () => navigateToTab(tabName);
  }, [navigateToTab]);

  return {
    // State
    navigationState,
    badgeCounts,
    
    // Actions
    navigateToTab,
    handleTabDoublePress,
    updateBadgeCount,
    clearBadge,
    
    // Utilities
    getBadgeCount,
    isTabActive,
    getTabPressHandler,
    triggerHapticFeedback,
  };
};