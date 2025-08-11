import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImage, deleteImage } from '../lib/storage';
import { User, Post } from '../types';
import {
  ProfileStats,
  ProfileUpdateData,
  ProfileData,
  Achievement,
  ProfileExportData,
  LoginEvent,
  SecuritySettings,
} from '../types/profile';
import { useAuth } from './useAuth';

interface UseProfileReturn {
  profile: User | null;
  stats: ProfileStats | null;
  posts: Post[];
  achievements: Achievement[];
  loading: boolean;
  updating: boolean;
  error: string | null;
  loadProfile: (userId?: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdateData) => Promise<boolean>;
  uploadProfilePhoto: (imageUri: string) => Promise<string | null>;
  deleteProfilePhoto: () => Promise<boolean>;
  refreshProfileData: () => Promise<void>;
  loadUserPosts: (limit?: number, offset?: number) => Promise<Post[]>;
  // Advanced features
  exportProfileData: () => Promise<ProfileExportData | null>;
  initiateAccountDeletion: (password: string) => Promise<boolean>;
  deactivateAccount: () => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  getLoginHistory: () => Promise<LoginEvent[]>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<boolean>;
  getSecuritySettings: () => Promise<SecuritySettings | null>;
}

export const useProfile = (targetUserId?: string): UseProfileReturn => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which user's profile to load
  const userId = targetUserId || currentUser?.id;
  const isOwnProfile = !targetUserId || targetUserId === currentUser?.id;

  const loadProfile = useCallback(async (userIdToLoad?: string) => {
    const profileUserId = userIdToLoad || userId;
    
    if (!profileUserId) {
      setError('No user ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          username,
          display_name,
          avatar_url,
          bio,
          created_at,
          updated_at
        `)
        .eq('id', profileUserId)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile(profileData as User);
        
        // Load profile statistics in parallel
        const [postsResult, friendsResult, cuisinesResult, achievementsResult] = await Promise.allSettled([
          // Posts count
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profileUserId)
            .eq('is_private', false),
          
          // Friends count (accepted friendships)
          supabase
            .from('friendships')
            .select('id', { count: 'exact', head: true })
            .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
            .eq('status', 'accepted'),
          
          // Cuisines tried count
          supabase
            .from('user_cuisine_progress')
            .select('cuisine_id', { count: 'exact', head: true })
            .eq('user_id', profileUserId),
          
          // User achievements (if available)
          supabase
            .from('user_achievements')
            .select(`
              id,
              achievement_id,
              unlocked_at,
              achievements (
                id,
                title,
                description,
                icon,
                color
              )
            `)
            .eq('user_id', profileUserId)
        ]);

        // Extract counts and handle errors gracefully
        const postsCount = postsResult.status === 'fulfilled' ? (postsResult.value.count || 0) : 0;
        const friendsCount = friendsResult.status === 'fulfilled' ? (friendsResult.value.count || 0) : 0;
        const cuisinesCount = cuisinesResult.status === 'fulfilled' ? (cuisinesResult.value.count || 0) : 0;

        // Set profile statistics
        setStats({
          postsCount,
          friendsCount,
          cuisinesCount,
          achievementsCount: achievementsResult.status === 'fulfilled' ? (achievementsResult.value.data?.length || 0) : 0,
          joinDate: profileData.created_at,
          lastActive: profileData.updated_at,
        });

        // Process achievements if available
        if (achievementsResult.status === 'fulfilled' && achievementsResult.value.data) {
          const userAchievements: Achievement[] = achievementsResult.value.data.map((ua: any) => ({
            id: ua.achievements.id,
            title: ua.achievements.title,
            description: ua.achievements.description,
            icon: ua.achievements.icon,
            color: ua.achievements.color,
            unlockedAt: ua.unlocked_at,
          }));
          setAchievements(userAchievements);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateProfile = useCallback(async (updates: ProfileUpdateData): Promise<boolean> => {
    if (!currentUser?.id || !isOwnProfile) {
      setError('Cannot update profile: not authorized');
      return false;
    }

    setUpdating(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local profile state
      if (profile) {
        setProfile({ ...profile, ...updates });
      }

      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [currentUser?.id, isOwnProfile, profile]);

  const uploadProfilePhoto = useCallback(async (imageUri: string): Promise<string | null> => {
    if (!currentUser?.id || !isOwnProfile) {
      setError('Cannot upload photo: not authorized');
      return null;
    }

    setUpdating(true);
    setError(null);

    try {
      // Delete existing avatar if present
      if (profile?.avatar_url) {
        await deleteImage(profile.avatar_url);
      }

      // Upload new avatar
      const uploadResult = await uploadImage(imageUri, currentUser.id, {
        generateThumbnail: true,
        quality: 0.9,
        maxWidth: 400,
        maxHeight: 400,
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      // Update user record with new avatar URL
      const success = await updateProfile({ avatar_url: uploadResult.url });
      
      return success ? uploadResult.url : null;
    } catch (err) {
      console.error('Error uploading profile photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      return null;
    } finally {
      setUpdating(false);
    }
  }, [currentUser?.id, isOwnProfile, profile?.avatar_url, updateProfile]);

  const deleteProfilePhoto = useCallback(async (): Promise<boolean> => {
    if (!currentUser?.id || !isOwnProfile || !profile?.avatar_url) {
      setError('Cannot delete photo: not authorized or no photo exists');
      return false;
    }

    setUpdating(true);
    setError(null);

    try {
      // Delete from storage
      await deleteImage(profile.avatar_url);

      // Update user record
      const success = await updateProfile({ avatar_url: null });
      
      return success;
    } catch (err) {
      console.error('Error deleting profile photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [currentUser?.id, isOwnProfile, profile?.avatar_url, updateProfile]);

  const loadUserPosts = useCallback(async (limit: number = 12, offset: number = 0): Promise<Post[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          restaurant_name,
          cuisine_id,
          rating,
          review_text,
          location_name,
          location_coords,
          dining_type,
          image_urls,
          is_private,
          created_at,
          updated_at,
          cuisine:cuisines(id, name, category, emoji),
          user:users(id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .eq('is_private', false) // Only show public posts unless it's own profile
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const userPosts = (data as Post[]) || [];
      
      // Update posts state if this is the first load
      if (offset === 0) {
        setPosts(userPosts);
      }

      return userPosts;
    } catch (err) {
      console.error('Error loading user posts:', err);
      return [];
    }
  }, [userId]);

  const refreshProfileData = useCallback(async (): Promise<void> => {
    await Promise.all([
      loadProfile(),
      loadUserPosts(12, 0), // Refresh first 12 posts
    ]);
  }, [loadProfile, loadUserPosts]);

  // Advanced Features

  const exportProfileData = useCallback(async (): Promise<ProfileExportData | null> => {
    if (!currentUser?.id || !isOwnProfile) return null;

    try {
      setLoading(true);

      // Fetch comprehensive profile data
      const [profileResult, postsResult, friendshipsResult, cuisineProgressResult, achievementsResult] = await Promise.allSettled([
        // Profile data
        supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single(),

        // Posts data
        supabase
          .from('posts')
          .select(`
            *,
            cuisine:cuisines(id, name, category, emoji)
          `)
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false }),

        // Friendships data
        supabase
          .from('friendships')
          .select(`
            *,
            requester:users!requester_id(id, username, display_name),
            addressee:users!addressee_id(id, username, display_name)
          `)
          .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`),

        // Cuisine progress
        supabase
          .from('user_cuisine_progress')
          .select(`
            *,
            cuisine:cuisines(id, name, category, emoji)
          `)
          .eq('user_id', currentUser.id),

        // Achievements
        supabase
          .from('user_achievements')
          .select(`
            *,
            achievement:achievements(id, title, description, icon, color)
          `)
          .eq('user_id', currentUser.id),
      ]);

      const exportData: ProfileExportData = {
        profile: profileResult.status === 'fulfilled' ? profileResult.value.data : {} as User,
        posts: postsResult.status === 'fulfilled' ? postsResult.value.data || [] : [],
        friendships: friendshipsResult.status === 'fulfilled' ? friendshipsResult.value.data || [] : [],
        cuisineProgress: cuisineProgressResult.status === 'fulfilled' ? cuisineProgressResult.value.data || [] : [],
        achievements: achievementsResult.status === 'fulfilled' ? achievementsResult.value.data || [] : [],
        activityLog: [], // Would need to be implemented with actual activity logging
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };

      return exportData;
    } catch (err) {
      console.error('Error exporting profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to export profile data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, isOwnProfile]);

  const initiateAccountDeletion = useCallback(async (password: string): Promise<boolean> => {
    if (!currentUser?.id || !isOwnProfile) return false;

    try {
      setUpdating(true);

      // Verify password first
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password,
      });

      if (authError) {
        setError('Invalid password');
        return false;
      }

      // Mark account for deletion
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30); // 30-day grace period

      const { error } = await supabase
        .from('user_account_settings')
        .upsert({
          user_id: currentUser.id,
          account_deletion_requested: new Date().toISOString(),
          account_deletion_scheduled: deletionDate.toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error initiating account deletion:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate account deletion');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [currentUser?.id, currentUser?.email, isOwnProfile]);

  const deactivateAccount = useCallback(async (): Promise<boolean> => {
    if (!currentUser?.id || !isOwnProfile) return false;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error deactivating account:', err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate account');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [currentUser?.id, isOwnProfile]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!currentUser?.email || !isOwnProfile) return false;

    try {
      setUpdating(true);

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: oldPassword,
      });

      if (signInError) {
        setError('Current password is incorrect');
        return false;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update security settings to track password change
      await supabase
        .from('user_security_settings')
        .upsert({
          user_id: currentUser.id,
          password_last_changed: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      return true;
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [currentUser?.id, currentUser?.email, isOwnProfile]);

  const getLoginHistory = useCallback(async (): Promise<LoginEvent[]> => {
    if (!currentUser?.id) return [];

    try {
      const { data, error } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        timestamp: item.created_at,
        location: item.location || 'Unknown',
        device: item.device || 'Unknown Device',
        ipAddress: item.ip_address || '',
        success: item.success,
        userAgent: item.user_agent,
      }));
    } catch (err) {
      console.error('Error loading login history:', err);
      return [];
    }
  }, [currentUser?.id]);

  const updateSecuritySettings = useCallback(async (settings: Partial<SecuritySettings>): Promise<boolean> => {
    if (!currentUser?.id || !isOwnProfile) return false;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('user_security_settings')
        .upsert({
          user_id: currentUser.id,
          two_factor_enabled: settings.twoFactorEnabled,
          session_timeout: settings.sessionTimeout,
          login_notifications: settings.loginNotifications,
          suspicious_activity_alerts: settings.suspiciousActivityAlerts,
          password_last_changed: settings.passwordLastChanged,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error updating security settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update security settings');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [currentUser?.id, isOwnProfile]);

  const getSecuritySettings = useCallback(async (): Promise<SecuritySettings | null> => {
    if (!currentUser?.id) return null;

    try {
      const { data, error } = await supabase
        .from('user_security_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Return default security settings
        return {
          twoFactorEnabled: false,
          sessionTimeout: 60,
          loginNotifications: true,
          suspiciousActivityAlerts: true,
          passwordLastChanged: new Date().toISOString(),
        };
      }

      return {
        twoFactorEnabled: data.two_factor_enabled || false,
        sessionTimeout: data.session_timeout || 60,
        loginNotifications: data.login_notifications !== false,
        suspiciousActivityAlerts: data.suspicious_activity_alerts !== false,
        passwordLastChanged: data.password_last_changed || new Date().toISOString(),
      };
    } catch (err) {
      console.error('Error loading security settings:', err);
      return null;
    }
  }, [currentUser?.id]);

  // Load profile data on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadProfile();
      loadUserPosts();
    }
  }, [userId, loadProfile, loadUserPosts]);

  return {
    profile,
    stats,
    posts,
    achievements,
    loading,
    updating,
    error,
    loadProfile,
    updateProfile,
    uploadProfilePhoto,
    deleteProfilePhoto,
    refreshProfileData,
    loadUserPosts,
    // Advanced features
    exportProfileData,
    initiateAccountDeletion,
    deactivateAccount,
    changePassword,
    getLoginHistory,
    updateSecuritySettings,
    getSecuritySettings,
  };
};