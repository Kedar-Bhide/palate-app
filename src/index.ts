// Export types
export * from './types';

// Export auth utilities
export * from './lib/auth';
export { supabase } from './lib/supabase';

// Export components
export { default as AuthForm } from './components/auth/AuthForm';

// Export screens
export { default as WelcomeScreen } from './screens/auth/WelcomeScreen';
export { default as SignInScreen } from './screens/auth/SignInScreen';
export { default as SignUpScreen } from './screens/auth/SignUpScreen';
export { default as MainScreen } from './screens/MainScreen';

// Export navigation
export { default as AuthNavigator } from './navigation/AuthNavigator';
export { default as RootNavigator } from './navigation/RootNavigator';

// Export contexts and hooks
export { AuthProvider, useAuth } from './contexts/AuthContext';

// Export constants
export { default as Colors } from './constants/Colors';
export { default as Layout } from './constants/Layout';