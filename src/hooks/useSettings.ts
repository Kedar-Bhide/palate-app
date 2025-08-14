import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  PrivacySettings,
  AccountSettings,
  AppPreferences,
  EditProfileFormData,
  FormValidationError,
} from '../types/profile';

interface UseSettingsReturn {
  privacySettings: PrivacySettings | null;
  accountSettings: AccountSettings | null;
  appPreferences: AppPreferences | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<boolean>;
  updateAccountSettings: (settings: Partial<AccountSettings>) => Promise<boolean>;
  updateAppPreferences: (preferences: Partial<AppPreferences>) => Promise<boolean>;
  validateUsername: (username: string, currentUsername?: string) => Promise<{ isValid: boolean; error?: string }>;
  validateProfileForm: (formData: EditProfileFormData) => FormValidationError[];
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  requestDataExport: () => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
  checkUnsavedChanges: (formData: EditProfileFormData, originalData: EditProfileFormData) => boolean;
}

// Default settings
const defaultPrivacySettings: PrivacySettings = {
  isPrivate: false,
  showEmail: false,
  showLocation: true,
  showLastSeen: true,
  allowFriendRequests: 'everyone',
  postVisibility: 'public',
  whoCanSendMessages: 'friends',
};

const defaultNotificationSettings: NotificationSettings = {
  achievements: 'both',
  weeklySummary: 'email',
  marketing: 'off',
  doNotDisturb: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
};

const defaultAccountSettings: AccountSettings = {
  twoFactorEnabled: false,
  connectedAccounts: {},
};

const defaultAppPreferences: AppPreferences = {
  darkMode: 'auto',
  language: 'en',
  measurementUnit: 'metric',
  autoPlayVideos: true,
  reducedMotion: false,
  hapticFeedback: true,
};

export const useSettings = (): UseSettingsReturn => {
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [accountSettings, setAccountSettings] = useState<AccountSettings | null>(null);
  const [appPreferences, setAppPreferences] = useState<AppPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Load settings from database and local storage in parallel
      const [
        privacyResult,
        accountResult,
        appPrefsResult,
      ] = await Promise.allSettled([
        // Privacy settings from database
        supabase
          .from('user_privacy_settings')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        
        // Account settings from database
        supabase
          .from('user_account_settings')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        // App preferences from local storage
        AsyncStorage.getItem(`app_preferences_${user.id}`),
      ]);

      // Process privacy settings
      if (privacyResult.status === 'fulfilled' && privacyResult.value.data) {
        setPrivacySettings({
          isPrivate: privacyResult.value.data.is_private ?? defaultPrivacySettings.isPrivate,
          showEmail: privacyResult.value.data.show_email ?? defaultPrivacySettings.showEmail,
          showLocation: privacyResult.value.data.show_location ?? defaultPrivacySettings.showLocation,
          showLastSeen: privacyResult.value.data.show_last_seen ?? defaultPrivacySettings.showLastSeen,
          allowFriendRequests: privacyResult.value.data.allow_friend_requests ?? defaultPrivacySettings.allowFriendRequests,
          postVisibility: privacyResult.value.data.post_visibility ?? defaultPrivacySettings.postVisibility,
          whoCanSendMessages: privacyResult.value.data.who_can_send_messages ?? defaultPrivacySettings.whoCanSendMessages,
        });
      } else {
        setPrivacySettings(defaultPrivacySettings);
      }


      // Process account settings
      if (accountResult.status === 'fulfilled' && accountResult.value.data) {
        const data = accountResult.value.data;
        setAccountSettings({
          twoFactorEnabled: data.two_factor_enabled ?? defaultAccountSettings.twoFactorEnabled,
          connectedAccounts: data.connected_accounts ?? defaultAccountSettings.connectedAccounts,
          dataExportRequested: data.data_export_requested,
          accountDeletionRequested: data.account_deletion_requested,
        });
      } else {
        setAccountSettings(defaultAccountSettings);
      }

      // Process app preferences
      if (appPrefsResult.status === 'fulfilled' && appPrefsResult.value) {
        try {
          const stored = JSON.parse(appPrefsResult.value);
          setAppPreferences({ ...defaultAppPreferences, ...stored });
        } catch {
          setAppPreferences(defaultAppPreferences);
        }
      } else {
        setAppPreferences(defaultAppPreferences);
      }

    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      // Set defaults on error
      setPrivacySettings(defaultPrivacySettings);
      setNotificationSettings(defaultNotificationSettings);
      setAccountSettings(defaultAccountSettings);
      setAppPreferences(defaultAppPreferences);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const updatePrivacySettings = useCallback(async (newSettings: Partial<PrivacySettings>): Promise<boolean> => {
    if (!user?.id || !privacySettings) return false;

    try {
      const updatedSettings = { ...privacySettings, ...newSettings };

      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          is_private: updatedSettings.isPrivate,
          show_email: updatedSettings.showEmail,
          show_location: updatedSettings.showLocation,
          show_last_seen: updatedSettings.showLastSeen,
          allow_friend_requests: updatedSettings.allowFriendRequests,
          post_visibility: updatedSettings.postVisibility,
          who_can_send_messages: updatedSettings.whoCanSendMessages,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setPrivacySettings(updatedSettings);
      return true;
    } catch (err) {
      console.error('Error updating privacy settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings');
      return false;
    }
  }, [user?.id, privacySettings]);


  const updateAccountSettings = useCallback(async (newSettings: Partial<AccountSettings>): Promise<boolean> => {
    if (!user?.id || !accountSettings) return false;

    try {
      const updatedSettings = { ...accountSettings, ...newSettings };

      const { error } = await supabase
        .from('user_account_settings')
        .upsert({
          user_id: user.id,
          two_factor_enabled: updatedSettings.twoFactorEnabled,
          connected_accounts: updatedSettings.connectedAccounts,
          data_export_requested: updatedSettings.dataExportRequested,
          account_deletion_requested: updatedSettings.accountDeletionRequested,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setAccountSettings(updatedSettings);
      return true;
    } catch (err) {
      console.error('Error updating account settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update account settings');
      return false;
    }
  }, [user?.id, accountSettings]);

  const updateAppPreferences = useCallback(async (newPreferences: Partial<AppPreferences>): Promise<boolean> => {
    if (!user?.id || !appPreferences) return false;

    try {
      const updatedPreferences = { ...appPreferences, ...newPreferences };
      
      await AsyncStorage.setItem(
        `app_preferences_${user.id}`,
        JSON.stringify(updatedPreferences)
      );

      setAppPreferences(updatedPreferences);
      return true;
    } catch (err) {
      console.error('Error updating app preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update app preferences');
      return false;
    }
  }, [user?.id, appPreferences]);

  const validateUsername = useCallback(async (username: string, currentUsername?: string): Promise<{ isValid: boolean; error?: string }> => {
    // Basic validation
    if (!username || username.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
      return { isValid: false, error: 'Username must be 20 characters or less' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }

    // Skip check if username hasn't changed
    if (username === currentUsername) {
      return { isValid: true };
    }

    try {
      // Check availability in database
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        return { isValid: false, error: 'Username is already taken' };
      }

      return { isValid: true };
    } catch (err) {
      console.error('Error validating username:', err);
      return { isValid: false, error: 'Unable to check username availability' };
    }
  }, []);

  const validateProfileForm = useCallback((formData: EditProfileFormData): FormValidationError[] => {
    const errors: FormValidationError[] = [];

    // Display name validation
    if (!formData.display_name.trim()) {
      errors.push({ field: 'display_name', message: 'Display name is required' });
    } else if (formData.display_name.length > 50) {
      errors.push({ field: 'display_name', message: 'Display name must be 50 characters or less' });
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.push({ field: 'username', message: 'Username is required' });
    } else if (formData.username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    } else if (formData.username.length > 20) {
      errors.push({ field: 'username', message: 'Username must be 20 characters or less' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Bio validation
    if (formData.bio.length > 150) {
      errors.push({ field: 'bio', message: 'Bio must be 150 characters or less' });
    }

    return errors;
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
      return false;
    }
  }, []);

  const requestDataExport = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const exportDate = new Date().toISOString();
      const success = await updateAccountSettings({ dataExportRequested: exportDate });
      
      if (success) {
        // TODO: Trigger backend data export process
        console.log('Data export requested for user:', user.id);
      }
      
      return success;
    } catch (err) {
      console.error('Error requesting data export:', err);
      setError(err instanceof Error ? err.message : 'Failed to request data export');
      return false;
    }
  }, [user?.id, updateAccountSettings]);

  const deleteAccount = useCallback(async (password: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Mark account for deletion
      const deletionDate = new Date().toISOString();
      const success = await updateAccountSettings({ accountDeletionRequested: deletionDate });
      
      if (success) {
        // TODO: Implement account deletion workflow
        console.log('Account deletion requested for user:', user.id);
      }
      
      return success;
    } catch (err) {
      console.error('Error requesting account deletion:', err);
      setError(err instanceof Error ? err.message : 'Failed to request account deletion');
      return false;
    }
  }, [user?.id, updateAccountSettings]);

  const checkUnsavedChanges = useCallback((formData: EditProfileFormData, originalData: EditProfileFormData): boolean => {
    return (
      formData.display_name !== originalData.display_name ||
      formData.username !== originalData.username ||
      formData.bio !== originalData.bio ||
      formData.location !== originalData.location ||
      formData.isPrivate !== originalData.isPrivate
    );
  }, []);

  // Load settings on mount
  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id, loadSettings]);

  return {
    privacySettings,
    accountSettings,
    appPreferences,
    loading,
    error,
    loadSettings,
    updatePrivacySettings,
    updateAccountSettings,
    updateAppPreferences,
    validateUsername,
    validateProfileForm,
    changePassword,
    requestDataExport,
    deleteAccount,
    checkUnsavedChanges,
  };
};