import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import {
  SettingsSection,
  SettingsRow,
  ToggleRow,
  SelectionRow,
  TextInputRow,
} from '../components/settings/SettingsSection';
import PrivacySettings from '../components/settings/PrivacySettings';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card from '../components/ui/Card';

interface SettingsScreenProps {
  navigation: any;
}

type SettingsTab = 'main' | 'account' | 'privacy' | 'app' | 'data' | 'about';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const {
    privacySettings,
    accountSettings,
    appPreferences,
    loading,
    error,
    updatePrivacySettings,
    updateAccountSettings,
    updateAppPreferences,
    changePassword,
    requestDataExport,
    deleteAccount,
  } = useSettings();

  const [currentTab, setCurrentTab] = useState<SettingsTab>('main');
  const [passwordChangeData, setPasswordChangeData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleBackToMain = useCallback(() => {
    setCurrentTab('main');
  }, []);

  const handleEditProfile = useCallback(() => {
    navigation.navigate('EditProfile');
  }, [navigation]);

  const handlePrivacySettingsChange = useCallback(async (settings: any) => {
    await updatePrivacySettings(settings);
  }, [updatePrivacySettings]);

  const handleNotificationSettingsChange = useCallback(async (settings: any) => {
    await updateNotificationSettings(settings);
  }, [updateNotificationSettings]);

  const handlePasswordChange = useCallback(async () => {
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (passwordChangeData.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    const success = await changePassword(passwordChangeData.oldPassword, passwordChangeData.newPassword);
    
    if (success) {
      Alert.alert('Success', 'Your password has been changed successfully.');
      setPasswordChangeData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      Alert.alert('Error', 'Failed to change password. Please check your current password.');
    }
  }, [passwordChangeData, changePassword]);

  const handleDataExport = useCallback(() => {
    Alert.alert(
      'Export Your Data',
      'We\'ll prepare a copy of your data and send it to your email address. This may take up to 24 hours.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Export',
          onPress: async () => {
            const success = await requestDataExport();
            if (success) {
              Alert.alert(
                'Export Requested',
                'Your data export has been requested. You\'ll receive an email when it\'s ready.'
              );
            } else {
              Alert.alert('Error', 'Failed to request data export. Please try again.');
            }
          },
        },
      ]
    );
  }, [requestDataExport]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Deletion',
              'Please enter your password to confirm account deletion:',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async (password) => {
                    if (!password) return;
                    
                    const success = await deleteAccount(password);
                    if (success) {
                      Alert.alert(
                        'Account Deletion Requested',
                        'Your account has been scheduled for deletion. You can cancel this within 30 days by logging in.'
                      );
                    } else {
                      Alert.alert('Error', 'Failed to delete account. Please check your password.');
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ]
    );
  }, [deleteAccount]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  }, [signOut]);

  const openURL = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerLeft}>
        {currentTab !== 'main' && (
          <TouchableOpacity
            onPress={handleBackToMain}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {currentTab === 'main' && 'Settings'}
          {currentTab === 'account' && 'Account Settings'}
          {currentTab === 'privacy' && 'Privacy & Safety'}
          {currentTab === 'notifications' && 'Notifications'}
          {currentTab === 'app' && 'App Preferences'}
          {currentTab === 'data' && 'Data & Privacy'}
          {currentTab === 'about' && 'About & Help'}
        </Text>
      </View>
    </View>
  );

  const renderMainSettings = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Account Settings */}
      <SettingsSection
        title="Account"
        description="Manage your account and profile"
        icon="person"
      >
        <SettingsRow
          title="Edit Profile"
          description="Update your profile information and photo"
          icon="edit"
          onPress={handleEditProfile}
        />

        <SettingsRow
          title="Account Settings"
          description="Password, email, and security settings"
          icon="security"
          onPress={() => setCurrentTab('account')}
        />
      </SettingsSection>

      {/* Privacy & Safety */}
      <SettingsSection
        title="Privacy & Safety"
        description="Control your privacy and safety settings"
        icon="shield"
      >
        <SettingsRow
          title="Privacy Settings"
          description="Control who can see your content and contact you"
          icon="lock"
          onPress={() => setCurrentTab('privacy')}
        />

        <SettingsRow
          title="Blocked Accounts"
          description="Manage accounts you've blocked"
          icon="block"
          onPress={() => {/* Navigate to blocked accounts */}}
        />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Manage your notification preferences"
        icon="notifications"
      >
        <SettingsRow
          title="Notification Settings"
          description="Choose what notifications you receive"
          icon="tune"
          onPress={() => setCurrentTab('notifications')}
        />
      </SettingsSection>

      {/* App Preferences */}
      <SettingsSection
        title="App"
        description="Customize your app experience"
        icon="palette"
      >
        <SettingsRow
          title="App Preferences"
          description="Theme, language, and accessibility settings"
          icon="settings"
          onPress={() => setCurrentTab('app')}
        />
      </SettingsSection>

      {/* Data & Privacy */}
      <SettingsSection
        title="Data & Privacy"
        description="Manage your data and privacy"
        icon="storage"
      >
        <SettingsRow
          title="Data Management"
          description="Export or delete your data"
          icon="download"
          onPress={() => setCurrentTab('data')}
        />
      </SettingsSection>

      {/* About & Help */}
      <SettingsSection
        title="About & Help"
        description="Get help and learn about Palate"
        icon="help"
      >
        <SettingsRow
          title="Help & Support"
          description="Get help and contact support"
          icon="support"
          onPress={() => setCurrentTab('about')}
        />
      </SettingsSection>

      {/* Sign Out */}
      <Card variant="flat" padding="none" style={styles.signOutCard}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <MaterialIcons name="logout" size={24} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );

  const renderAccountSettings = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Information */}
      <SettingsSection
        title="Profile Information"
        description="Basic information about your account"
        icon="person"
      >
        <SettingsRow
          title="Email"
          description={user?.email || 'No email'}
          icon="email"
          showChevron={false}
        />

        <SettingsRow
          title="Username"
          description={`@${user?.username || 'username'}`}
          icon="alternate-email"
          showChevron={false}
        />

        <SettingsRow
          title="Edit Profile"
          description="Update your profile information"
          icon="edit"
          onPress={handleEditProfile}
        />
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        title="Security"
        description="Keep your account secure"
        icon="security"
      >
        <TextInputRow
          title="Current Password"
          icon="lock"
          value={passwordChangeData.oldPassword}
          onChangeText={(text) => setPasswordChangeData(prev => ({ ...prev, oldPassword: text }))}
          placeholder="Enter current password"
          secureTextEntry
        />

        <TextInputRow
          title="New Password"
          icon="lock-open"
          value={passwordChangeData.newPassword}
          onChangeText={(text) => setPasswordChangeData(prev => ({ ...prev, newPassword: text }))}
          placeholder="Enter new password"
          secureTextEntry
        />

        <TextInputRow
          title="Confirm New Password"
          icon="lock"
          value={passwordChangeData.confirmPassword}
          onChangeText={(text) => setPasswordChangeData(prev => ({ ...prev, confirmPassword: text }))}
          placeholder="Confirm new password"
          secureTextEntry
        />

        <SettingsRow
          title="Change Password"
          description="Update your account password"
          icon="sync"
          onPress={handlePasswordChange}
          disabled={!passwordChangeData.oldPassword || !passwordChangeData.newPassword || !passwordChangeData.confirmPassword}
        />

        <ToggleRow
          title="Two-Factor Authentication"
          description={accountSettings?.twoFactorEnabled ? "Enabled" : "Enhance account security with 2FA"}
          icon="verified-user"
          value={accountSettings?.twoFactorEnabled || false}
          onValueChange={(value) => updateAccountSettings({ twoFactorEnabled: value })}
          disabled
        />
      </SettingsSection>

      {/* Connected Accounts */}
      <SettingsSection
        title="Connected Accounts"
        description="Manage connected social accounts"
        icon="link"
      >
        <ToggleRow
          title="Google"
          description="Connect with your Google account"
          icon="account-circle"
          value={accountSettings?.connectedAccounts?.google || false}
          onValueChange={(value) => updateAccountSettings({ 
            connectedAccounts: { 
              ...accountSettings?.connectedAccounts,
              google: value 
            }
          })}
          disabled
        />

        <ToggleRow
          title="Apple"
          description="Connect with your Apple ID"
          icon="phone-iphone"
          value={accountSettings?.connectedAccounts?.apple || false}
          onValueChange={(value) => updateAccountSettings({ 
            connectedAccounts: { 
              ...accountSettings?.connectedAccounts,
              apple: value 
            }
          })}
          disabled
        />
      </SettingsSection>
    </ScrollView>
  );

  const renderAppPreferences = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize how the app looks"
        icon="palette"
      >
        <SelectionRow
          title="Theme"
          description="Choose your preferred theme"
          icon="brightness-6"
          selectedValue={appPreferences?.darkMode || 'auto'}
          options={[
            { label: 'Auto (System)', value: 'auto' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          onValueChange={(value) => updateAppPreferences({ darkMode: value as any })}
        />

        <ToggleRow
          title="Reduced Motion"
          description="Reduce animations and motion effects"
          icon="motion-photos-off"
          value={appPreferences?.reducedMotion || false}
          onValueChange={(value) => updateAppPreferences({ reducedMotion: value })}
        />
      </SettingsSection>

      {/* Accessibility */}
      <SettingsSection
        title="Accessibility"
        description="Make the app easier to use"
        icon="accessibility"
      >
        <ToggleRow
          title="Haptic Feedback"
          description="Feel vibrations for interactions"
          icon="vibration"
          value={appPreferences?.hapticFeedback !== false}
          onValueChange={(value) => updateAppPreferences({ hapticFeedback: value })}
        />

        <SettingsRow
          title="System Accessibility"
          description="Open device accessibility settings"
          icon="settings-accessibility"
          onPress={() => {
            if (Platform.OS === 'ios') {
              Linking.openURL('App-Prefs:ACCESSIBILITY');
            } else {
              Linking.openSettings();
            }
          }}
        />
      </SettingsSection>

      {/* Content */}
      <SettingsSection
        title="Content"
        description="Control media and content settings"
        icon="play-circle"
      >
        <ToggleRow
          title="Auto-Play Videos"
          description="Automatically play videos in feed"
          icon="play-circle-outline"
          value={appPreferences?.autoPlayVideos !== false}
          onValueChange={(value) => updateAppPreferences({ autoPlayVideos: value })}
        />

        <SelectionRow
          title="Measurement Units"
          description="Choose your preferred units"
          icon="straighten"
          selectedValue={appPreferences?.measurementUnit || 'metric'}
          options={[
            { label: 'Metric (km, kg)', value: 'metric' },
            { label: 'Imperial (mi, lbs)', value: 'imperial' },
          ]}
          onValueChange={(value) => updateAppPreferences({ measurementUnit: value as any })}
        />
      </SettingsSection>

      {/* Language */}
      <SettingsSection
        title="Language & Region"
        description="Language and regional preferences"
        icon="language"
      >
        <SettingsRow
          title="Language"
          description="English"
          icon="translate"
          rightComponent={
            <Text style={styles.comingSoon}>Coming Soon</Text>
          }
          showChevron={false}
        />
      </SettingsSection>
    </ScrollView>
  );

  const renderDataManagement = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Data Export */}
      <SettingsSection
        title="Your Data"
        description="Manage your personal data"
        icon="storage"
      >
        <SettingsRow
          title="Export Data"
          description="Download a copy of your data"
          icon="download"
          onPress={handleDataExport}
        />

        <SettingsRow
          title="Data Usage"
          description="See how your data is used"
          icon="info"
          onPress={() => openURL('https://palate-app.com/privacy')}
        />
      </SettingsSection>

      {/* Account Management */}
      <SettingsSection
        title="Account Management"
        description="Manage your account"
        icon="manage-accounts"
      >
        <SettingsRow
          title="Deactivate Account"
          description="Temporarily deactivate your account"
          icon="pause"
          onPress={() => Alert.alert('Coming Soon', 'Account deactivation will be available soon.')}
        />

        <SettingsRow
          title="Delete Account"
          description="Permanently delete your account and data"
          icon="delete-forever"
          onPress={handleDeleteAccount}
        />
      </SettingsSection>

      {/* Information */}
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <MaterialIcons
            name="info"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.infoTitle}>Data Privacy</Text>
        </View>
        
        <Text style={styles.infoText}>
          We're committed to protecting your privacy. You have full control over your data 
          and can export or delete it at any time. Learn more about how we handle your data 
          in our privacy policy.
        </Text>
      </View>
    </ScrollView>
  );

  const renderAboutAndHelp = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Help */}
      <SettingsSection
        title="Help & Support"
        description="Get help when you need it"
        icon="help"
      >
        <SettingsRow
          title="Help Center"
          description="Find answers to common questions"
          icon="help-center"
          onPress={() => openURL('https://palate-app.com/help')}
        />

        <SettingsRow
          title="Contact Support"
          description="Get in touch with our support team"
          icon="support-agent"
          onPress={() => openURL('mailto:support@palate-app.com')}
        />

        <SettingsRow
          title="Report a Bug"
          description="Help us improve by reporting issues"
          icon="bug-report"
          onPress={() => openURL('mailto:support@palate-app.com?subject=Bug Report')}
        />
      </SettingsSection>

      {/* About */}
      <SettingsSection
        title="About Palate"
        description="Learn more about our app"
        icon="info"
      >
        <SettingsRow
          title="Version"
          description="1.0.0"
          icon="info"
          showChevron={false}
        />

        <SettingsRow
          title="Privacy Policy"
          description="Read our privacy policy"
          icon="policy"
          onPress={() => openURL('https://palate-app.com/privacy')}
        />

        <SettingsRow
          title="Terms of Service"
          description="Read our terms of service"
          icon="description"
          onPress={() => openURL('https://palate-app.com/terms')}
        />

        <SettingsRow
          title="Open Source Licenses"
          description="View open source licenses"
          icon="code"
          onPress={() => Alert.alert('Coming Soon', 'Open source licenses will be available soon.')}
        />
      </SettingsSection>

      {/* Social */}
      <SettingsSection
        title="Connect With Us"
        description="Follow us on social media"
        icon="group"
      >
        <SettingsRow
          title="Follow on Twitter"
          description="@PalateApp"
          icon="alternate-email"
          onPress={() => openURL('https://twitter.com/PalateApp')}
        />

        <SettingsRow
          title="Like on Instagram"
          description="@palate_app"
          icon="photo-camera"
          onPress={() => openURL('https://instagram.com/palate_app')}
        />
      </SettingsSection>
    </ScrollView>
  );

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      {currentTab === 'main' && renderMainSettings()}
      {currentTab === 'account' && renderAccountSettings()}
      {currentTab === 'privacy' && privacySettings && (
        <PrivacySettings
          settings={privacySettings}
          onSettingsChange={handlePrivacySettingsChange}
          loading={loading}
        />
      )}
      {currentTab === 'app' && renderAppPreferences()}
      {currentTab === 'data' && renderDataManagement()}
      {currentTab === 'about' && renderAboutAndHelp()}
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['3xl'],
  },
  signOutCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${theme.colors.error}20`,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: `${theme.colors.error}05`,
  },
  signOutText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.error,
    marginLeft: theme.spacing.md,
  },
  comingSoon: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
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
  infoContainer: {
    backgroundColor: `${theme.colors.primary}08`,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}20`,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
});

export default SettingsScreen;