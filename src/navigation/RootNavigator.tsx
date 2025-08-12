import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import CreatePostScreen from '../screens/CreatePostScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import PhotoSelectionScreen from '../screens/PhotoSelectionScreen';
import { theme } from '../theme';
import { RootStackParamList } from './types';

export type AuthStackParamList = {
  Auth: undefined;
  App: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

function AuthenticatedApp() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <RootStack.Screen name="Main" component={TabNavigator} />
      <RootStack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <RootStack.Screen 
        name="PostDetail" 
        component={PostDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <RootStack.Screen 
        name="UserProfile" 
        component={UserProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <RootStack.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </RootStack.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {isAuthenticated ? (
        <AuthStack.Screen name="App" component={AuthenticatedApp} />
      ) : (
        <AuthStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});