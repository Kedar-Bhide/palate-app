import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PrivacySettings as PrivacySettingsType } from '../../types/profile';
import { theme } from '../../theme';
import {
  SettingsSection,
  ToggleRow,
  SelectionRow,
  SettingsRow,
} from './SettingsSection';

export interface PrivacySettingsProps {
  settings: PrivacySettingsType;
  onSettingsChange: (settings: Partial<PrivacySettingsType>) => Promise<void>;
  loading?: boolean;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  settings,
  onSettingsChange,
  loading = false,
}) => {
  const handleToggleChange = async (key: keyof PrivacySettingsType, value: boolean) => {
    await onSettingsChange({ [key]: value });
  };

  const handleSelectionChange = async (key: keyof PrivacySettingsType, value: string) => {
    await onSettingsChange({ [key]: value });
  };

  const handlePrivateAccountToggle = async (isPrivate: boolean) => {
    if (isPrivate) {
      Alert.alert(
        'Make Account Private?',
        'Your posts will only be visible to approved followers. Existing followers will not be affected.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Make Private',
            onPress: () => handleToggleChange('isPrivate', true),
            style: 'default',
          },
        ]
      );
    } else {
      Alert.alert(
        'Make Account Public?',
        'Anyone will be able to see your posts without following you first.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Make Public',
            onPress: () => handleToggleChange('isPrivate', false),
            style: 'default',
          },
        ]
      );
    }
  };

  const friendRequestOptions = [
    { label: 'Everyone', value: 'everyone' },
    { label: 'Friends of Friends', value: 'friends_of_friends' },
    { label: 'Turn Off', value: 'off' },
  ];

  const postVisibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Friends Only', value: 'friends' },
    { label: 'Custom', value: 'custom' },
  ];

  const messagingOptions = [
    { label: 'Everyone', value: 'everyone' },
    { label: 'Friends Only', value: 'friends' },
    { label: 'Turn Off', value: 'off' },
  ];

  return (
    <View style={styles.container}>
      {/* Account Privacy */}
      <SettingsSection
        title="Account Privacy"
        description="Control who can see your content and interact with you"
        icon="security"
      >
        <ToggleRow
          title="Private Account"
          description={settings.isPrivate 
            ? "Only approved followers can see your posts" 
            : "Anyone can see your posts"
          }
          icon="lock"
          value={settings.isPrivate}
          onValueChange={handlePrivateAccountToggle}
          disabled={loading}
        />

        <SelectionRow
          title="Who Can Send Friend Requests"
          description="Control who can send you friend requests"
          icon="person-add"
          selectedValue={settings.allowFriendRequests}
          options={friendRequestOptions}
          onValueChange={(value) => handleSelectionChange('allowFriendRequests', value)}
          disabled={loading}
        />

        <SelectionRow
          title="Post Visibility"
          description="Default visibility for new posts"
          icon="visibility"
          selectedValue={settings.postVisibility}
          options={postVisibilityOptions}
          onValueChange={(value) => handleSelectionChange('postVisibility', value)}
          disabled={loading}
        />

        <SelectionRow
          title="Who Can Message You"
          description="Control who can send you direct messages"
          icon="message"
          selectedValue={settings.whoCanSendMessages}
          options={messagingOptions}
          onValueChange={(value) => handleSelectionChange('whoCanSendMessages', value)}
          disabled={loading}
        />
      </SettingsSection>

      {/* Profile Information */}
      <SettingsSection
        title="Profile Information"
        description="Choose what information is visible on your profile"
        icon="person"
      >
        <ToggleRow
          title="Show Email"
          description="Display your email address on your profile"
          icon="email"
          value={settings.showEmail}
          onValueChange={(value) => handleToggleChange('showEmail', value)}
          disabled={loading}
        />

        <ToggleRow
          title="Show Location"
          description="Display your location on your profile"
          icon="location-on"
          value={settings.showLocation}
          onValueChange={(value) => handleToggleChange('showLocation', value)}
          disabled={loading}
        />

        <ToggleRow
          title="Show Last Seen"
          description="Let others see when you were last active"
          icon="schedule"
          value={settings.showLastSeen}
          onValueChange={(value) => handleToggleChange('showLastSeen', value)}
          disabled={loading}
        />
      </SettingsSection>

      {/* Safety Tools */}
      <SettingsSection
        title="Safety & Blocking"
        description="Tools to help you stay safe on Palate"
        icon="shield"
      >
        <SettingsRow
          title="Blocked Accounts"
          description="Manage accounts you've blocked"
          icon="block"
          onPress={() => {/* Navigate to blocked accounts */}}
        />

        <SettingsRow
          title="Report a Problem"
          description="Report inappropriate content or behavior"
          icon="report"
          onPress={() => {/* Open report form */}}
        />

        <SettingsRow
          title="Safety Center"
          description="Learn about staying safe on social platforms"
          icon="help"
          onPress={() => {/* Open safety resources */}}
        />
      </SettingsSection>

      {/* Privacy Information */}
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <MaterialIcons
            name="info"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.infoTitle}>Your Privacy</Text>
        </View>
        
        <Text style={styles.infoText}>
          We're committed to protecting your privacy. These settings help you control 
          what information you share and who can see it. You can change these settings 
          at any time.
        </Text>
        
        <Text style={styles.infoLink}>
          Learn more about privacy on Palate
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: theme.spacing.sm,
  },
  infoLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default PrivacySettings;