/**
 * Authentication helper functions for Palate app
 * Handles Supabase auth with automatic user profile creation
 */

import { supabase } from './supabase';
import { isUsernameAvailable } from './queries';
import type { User, UserInsert, UserUpdate, DatabaseResponse, UUID } from './database.types';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Auth response types
export interface AuthUser {
  id: UUID;
  email: string;
  profile?: User | null;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  display_name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  session: Session | null;
  error: string | null;
}

// =============================================================================
// AUTHENTICATION FUNCTIONS
// =============================================================================

/**
 * Sign up a new user with email and password
 * Automatically creates user profile in users table
 */
export async function signUp(signUpData: SignUpData): Promise<AuthResponse> {
  try {
    const { email, password, username, display_name } = signUpData;

    // Check if username is available
    const { data: isAvailable, error: usernameError } = await isUsernameAvailable(username);
    
    if (usernameError) {
      return { user: null, session: null, error: usernameError };
    }

    if (!isAvailable) {
      return { user: null, session: null, error: 'Username is already taken' };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { user: null, session: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, session: null, error: 'Failed to create user account' };
    }

    // Create user profile in users table
    const userProfile: UserInsert = {
      id: authData.user.id,
      email: authData.user.email!,
      username,
      display_name: display_name || null,
      avatar_url: null,
      bio: null,
      push_token: null,
    };

    const { error: profileError } = await supabase
      .from('users')
      .insert(userProfile);

    if (profileError) {
      // If profile creation fails, we should clean up the auth user
      // But for now, we'll just return the error
      return { user: null, session: null, error: profileError.message };
    }

    const authUser: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      profile: { ...userProfile, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    };

    return { 
      user: authUser, 
      session: authData.session, 
      error: null 
    };
  } catch (error) {
    return { user: null, session: null, error: (error as Error).message };
  }
}

/**
 * Sign in existing user with email and password
 */
export async function signIn(signInData: SignInData): Promise<AuthResponse> {
  try {
    const { email, password } = signInData;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { user: null, session: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, session: null, error: 'Failed to sign in' };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      // Profile might not exist, create it
      const userProfile: UserInsert = {
        id: authData.user.id,
        email: authData.user.email!,
        username: authData.user.email!.split('@')[0], // Fallback username
        display_name: null,
        avatar_url: null,
        bio: null,
        push_token: null,
      };

      const { error: createError } = await supabase
        .from('users')
        .insert(userProfile);

      if (createError) {
        return { user: null, session: null, error: createError.message };
      }
    }

    const authUser: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      profile: profile || null,
    };

    return { 
      user: authUser, 
      session: authData.session, 
      error: null 
    };
  } catch (error) {
    return { user: null, session: null, error: (error as Error).message };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error: (error as Error).message };
  }
}

/**
 * Get current authenticated user with profile
 */
export async function getCurrentUser(): Promise<DatabaseResponse<AuthUser>> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return { data: null, error: authError.message };
    }

    if (!authUser) {
      return { data: null, error: 'No authenticated user' };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    const currentUser: AuthUser = {
      id: authUser.id,
      email: authUser.email!,
      profile,
    };

    return { data: currentUser, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<DatabaseResponse<Session>> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: session, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(userId: UUID, updates: UserUpdate): Promise<DatabaseResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Update user email (requires re-authentication)
 */
export async function updateEmail(newEmail: string): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return { data: false, error: error.message };
    }

    // Update email in users table as well
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !user) {
      return { data: false, error: 'Failed to get current user' };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return { data: false, error: updateError.message };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error: (error as Error).message };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error: (error as Error).message };
  }
}

/**
 * Reset password via email
 */
export async function resetPassword(email: string): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'palate://auth/reset-password',
    });

    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error: (error as Error).message };
  }
}

/**
 * Update push notification token
 */
export async function updatePushToken(userId: UUID, pushToken: string): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ push_token: pushToken, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: false, error: (error as Error).message };
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        profile: profile || null,
      };

      callback(authUser);
    } else {
      callback(null);
    }
  });
}

/**
 * Refresh current session
 */
export async function refreshSession(): Promise<DatabaseResponse<Session>> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data.session, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate username format
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }

  return { isValid: true };
}