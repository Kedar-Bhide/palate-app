import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange,
  AuthUser,
  SignInData,
  SignUpData,
  AuthResponse,
} from '../lib/auth';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  initializing: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (data: SignInData) => Promise<AuthResponse>;
  signUp: (data: SignUpData) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: false,
    initializing: true,
  });

  useEffect(() => {
    let mounted = true;

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: session } = await getCurrentSession();
        
        if (session && mounted) {
          // Get current user with profile
          const { data: user } = await getCurrentUser();
          setState({
            user,
            session,
            loading: false,
            initializing: false,
          });
        } else if (mounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            initializing: false,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            initializing: false,
          });
        }
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);

        if (session?.user) {
          setState(prev => ({ ...prev, loading: true }));
          
          // Get user profile with retry mechanism
          console.log('🔧 Loading user profile for:', session.user.id);
          let profile = null;
          let retries = 3;
          
          while (retries > 0 && !profile) {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (data) {
              profile = data;
              console.log('✅ Profile loaded:', profile);
            } else if (error) {
              console.log('🔧 Profile not found, retrying...', error.message);
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }

          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            profile: profile || null,
          };

          console.log('🔧 Final auth user:', authUser);

          setState({
            user: authUser,
            session,
            loading: false,
            initializing: false,
          });
        } else {
          setState({
            user: null,
            session: null,
            loading: false,
            initializing: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (data: SignInData): Promise<AuthResponse> => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await authSignIn(data);
      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const signUp = async (data: SignUpData): Promise<AuthResponse> => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await authSignUp(data);
      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const signOut = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await authSignOut();
      setState({
        user: null,
        session: null,
        loading: false,
        initializing: false,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshSession = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const { data: session } = await getCurrentSession();
      if (session) {
        const { data: user } = await getCurrentUser();
        setState({
          user,
          session,
          loading: false,
          initializing: false,
        });
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!state.session?.user) return;
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      console.log('🔧 Manually refreshing profile...');
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', state.session.user.id)
        .single();

      const updatedUser: AuthUser = {
        id: state.session.user.id,
        email: state.session.user.email!,
        profile: profile || null,
      };

      console.log('✅ Profile refreshed:', profile);

      setState(prev => ({
        ...prev,
        user: updatedUser,
        loading: false,
      }));
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
    refreshProfile,
    isAuthenticated: !!state.user && !!state.session,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}