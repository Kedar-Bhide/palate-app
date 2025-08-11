import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { EditProfileFormData } from '../types/profile';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useSettings } from '../hooks/useSettings';
import EditProfileForm from '../components/profile/EditProfileForm';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface EditProfileScreenProps {
  navigation: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { 
    profile, 
    updateProfile, 
    uploadProfilePhoto, 
    loading: profileLoading 
  } = useProfile();
  const { 
    validateUsername, 
    updatePrivacySettings, 
    privacySettings,
    loading: settingsLoading 
  } = useSettings();

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentProfile = profile || user;
  const loading = profileLoading || settingsLoading || !currentProfile;

  // Handle hardware back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (hasUnsavedChanges) {
          Alert.alert(
            'Unsaved Changes',
            'You have unsaved changes. Are you sure you want to discard them?',
            [
              {
                text: 'Keep Editing',
                onPress: () => null,
                style: 'cancel',
              },
              {
                text: 'Discard Changes',
                onPress: () => navigation.goBack(),
                style: 'destructive',
              },
            ]
          );
          return true; // Prevent default behavior
        }
        return false; // Allow default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [hasUnsavedChanges, navigation])
  );

  const handleSave = useCallback(async (formData: EditProfileFormData): Promise<boolean> => {
    if (!currentProfile) return false;

    setSaving(true);
    
    try {
      let success = true;

      // Update profile photo if changed
      if (formData.avatar_url && formData.avatar_url !== currentProfile.avatar_url) {
        const uploadedUrl = await uploadProfilePhoto(formData.avatar_url);
        if (!uploadedUrl) {
          success = false;
        } else {
          formData.avatar_url = uploadedUrl;
        }
      } else if (!formData.avatar_url && currentProfile.avatar_url) {
        // Handle photo removal
        await uploadProfilePhoto(''); // Empty string signals removal
        formData.avatar_url = undefined;
      }

      // Update profile information
      if (success) {
        success = await updateProfile({
          display_name: formData.display_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          // Note: Username changes would typically require additional verification
        });
      }

      // Update privacy settings if changed
      if (success && privacySettings && formData.isPrivate !== privacySettings.isPrivate) {
        success = await updatePrivacySettings({
          isPrivate: formData.isPrivate,
        });
      }

      if (success) {
        setHasUnsavedChanges(false);
        Alert.alert(
          'Profile Updated',
          'Your profile has been successfully updated.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error('Failed to update profile');
      }

      return success;
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(
        'Save Failed',
        'There was an error updating your profile. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentProfile, uploadProfilePhoto, updateProfile, privacySettings, updatePrivacySettings, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleUsernameValidation = useCallback(async (username: string) => {
    if (!currentProfile) return { isValid: false, error: 'No profile data' };
    
    return await validateUsername(username, currentProfile.username);
  }, [validateUsername, currentProfile]);

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if no profile data
  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Profile</Text>
          <Text style={styles.errorMessage}>
            There was an error loading your profile data. Please try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        
        <View style={styles.headerActions}>
          {saving && (
            <View style={styles.savingIndicator}>
              <LoadingSpinner size="small" />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <EditProfileForm
          initialData={currentProfile}
          onSave={handleSave}
          onCancel={handleCancel}
          loading={saving}
          onUsernameValidation={handleUsernameValidation}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.full,
  },
  savingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
});

export default EditProfileScreen;