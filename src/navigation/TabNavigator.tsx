import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';

import { TabParamList } from './types';
import { theme } from '../theme';
import { CustomTabBar } from '../components/navigation/CustomTabBar';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import MyPostsScreen from '../screens/MyPostsScreen';
import CameraScreen from '../screens/CameraScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        animation: 'fade',
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: 'Home tab, Friends feed',
        }}
      />
      <Tab.Screen
        name="MyPosts"
        component={MyPostsScreen}
        options={{
          tabBarAccessibilityLabel: 'My Posts tab, Personal timeline',
        }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarAccessibilityLabel: 'Camera tab, Take photo',
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarAccessibilityLabel: 'Discover tab, Find friends',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: 'Profile tab, User settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;