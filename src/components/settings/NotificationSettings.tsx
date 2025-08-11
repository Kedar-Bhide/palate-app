import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { NotificationSettings as NotificationSettingsType } from '../../types/profile';
import { theme } from '../../theme';
import {
  SettingsSection,
  ToggleRow,
  SelectionRow,
  SettingsRow,
  TextInputRow,
} from './SettingsSection';

export interface NotificationSettingsProps {
  settings: NotificationSettingsType;
  onSettingsChange: (settings: Partial<NotificationSettingsType>) => Promise<void>;
  loading?: boolean;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  settings,
  onSettingsChange,
  loading = false,
}) => {
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>('unknown');

  const checkPushPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPushPermissionStatus(status);
    return status === 'granted';
  };

  const requestPushPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPushPermissionStatus(status);
    
    if (status === 'granted') {
      await onSettingsChange({ pushEnabled: true });
    } else {
      Alert.alert(
        'Push Notifications Disabled',
        'To receive push notifications, please enable them in your device settings.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                // Note: Linking.openSettings() would be used here in a real app
                console.log('Would open iOS settings');
              }
            },
          },
        ]
      );
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await checkPushPermissions();
      if (!hasPermission) {
        await requestPushPermissions();
        return;
      }
    }
    
    await onSettingsChange({ pushEnabled: enabled });
  };

  const handleNotificationTypeChange = async (
    type: keyof NotificationSettingsType,
    value: string
  ) => {
    await onSettingsChange({ [type]: value });
  };

  const handleDoNotDisturbChange = async (field: string, value: boolean | string) => {
    await onSettingsChange({
      doNotDisturb: {
        ...settings.doNotDisturb,
        [field]: value,
      },
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const notificationTypeOptions = [
    { label: 'Push & Email', value: 'both' },
    { label: 'Push Only', value: 'push' },
    { label: 'Email Only', value: 'email' },
    { label: 'Off', value: 'off' },
  ];

  const emailOnlyOptions = [
    { label: 'Email', value: 'email' },
    { label: 'Off', value: 'off' },
  ];

  return (
    <View style={styles.container}>
      {/* Push Notifications */}
      <SettingsSection
        title="Push Notifications"
        description="Receive notifications on your device"
        icon="notifications"
      >
        <ToggleRow
          title="Enable Push Notifications"
          description={settings.pushEnabled 
            ? "Notifications will be sent to your device" 
            : "Push notifications are disabled"
          }
          icon="phone-iphone"
          value={settings.pushEnabled}
          onValueChange={handlePushToggle}
          disabled={loading}
        />

        {!settings.pushEnabled && (
          <View style={styles.warningContainer}>
            <MaterialIcons
              name="warning"
              size={16}
              color={theme.colors.warning}
            />
            <Text style={styles.warningText}>
              You won't receive real-time notifications without push notifications enabled.
            </Text>
          </View>
        )}
      </SettingsSection>

      {/* Email Notifications */}
      <SettingsSection
        title="Email Notifications"
        description="Receive notifications via email"
        icon="email"
      >
        <ToggleRow
          title="Enable Email Notifications"
          description={settings.emailEnabled 
            ? "Notifications will be sent to your email" 
            : "Email notifications are disabled"
          }
          icon="mail"
          value={settings.emailEnabled}
          onValueChange={(value) => onSettingsChange({ emailEnabled: value })}
          disabled={loading}
        />
      </SettingsSection>

      {/* Notification Types */}
      <SettingsSection
        title="What You'll Receive"
        description="Choose which notifications you want to receive"
        icon="tune"
      >
        <SelectionRow
          title="Friend Requests"
          description="When someone sends you a friend request"
          icon="person-add"
          selectedValue={settings.friendRequests}
          options={notificationTypeOptions}
          onValueChange={(value) => handleNotificationTypeChange('friendRequests', value)}
          disabled={loading}
        />

        <SelectionRow
          title="New Posts from Friends"
          description="When friends share new food experiences"
          icon="restaurant"
          selectedValue={settings.newPosts}
          options={notificationTypeOptions}
          onValueChange={(value) => handleNotificationTypeChange('newPosts', value)}
          disabled={loading}
        />

        <SelectionRow
          title="Likes and Comments"
          description="When someone likes or comments on your posts"
          icon="favorite"
          selectedValue={settings.likesAndComments}
          options={notificationTypeOptions}
          onValueChange={(value) => handleNotificationTypeChange('likesAndComments', value)}
          disabled={loading}
        />

        <SelectionRow
          title="Achievements"
          description="When you unlock new achievements"
          icon="emoji-events"
          selectedValue={settings.achievements}
          options={notificationTypeOptions}
          onValueChange={(value) => handleNotificationTypeChange('achievements', value)}
          disabled={loading}
        />
      </SettingsSection>

      {/* Digest Notifications */}
      <SettingsSection
        title="Digest & Updates"
        description="Periodic summaries and updates"
        icon="schedule"
      >
        <SelectionRow
          title="Weekly Summary"
          description="A weekly recap of your activity and friends' posts"
          icon="date-range"
          selectedValue={settings.weeklySummary}
          options={emailOnlyOptions}
          onValueChange={(value) => handleNotificationTypeChange('weeklySummary', value)}
          disabled={loading}
        />

        <SelectionRow
          title="Marketing & Promotions"
          description="Updates about new features and special offers"
          icon="local-offer"
          selectedValue={settings.marketing}
          options={emailOnlyOptions}
          onValueChange={(value) => handleNotificationTypeChange('marketing', value)}
          disabled={loading}
        />
      </SettingsSection>

      {/* Do Not Disturb */}
      <SettingsSection
        title="Do Not Disturb"
        description="Quiet hours when you won't receive notifications"
        icon="do-not-disturb"
      >
        <ToggleRow
          title="Enable Do Not Disturb"
          description={settings.doNotDisturb.enabled 
            ? `Quiet hours: ${formatTime(settings.doNotDisturb.startTime)} - ${formatTime(settings.doNotDisturb.endTime)}`
            : "Receive notifications at any time"
          }
          icon="bedtime"
          value={settings.doNotDisturb.enabled}
          onValueChange={(value) => handleDoNotDisturbChange('enabled', value)}
          disabled={loading}
        />

        {settings.doNotDisturb.enabled && (
          <>
            <SettingsRow
              title="Start Time"
              description="When quiet hours begin"
              icon="bedtime"
              rightComponent={
                <Text style={styles.timeText}>
                  {formatTime(settings.doNotDisturb.startTime)}
                </Text>
              }
              onPress={() => {
                // TODO: Show time picker
                Alert.alert('Time Picker', 'Time picker would open here');
              }}
            />

            <SettingsRow
              title="End Time"
              description="When quiet hours end"
              icon="wb-sunny"
              rightComponent={
                <Text style={styles.timeText}>
                  {formatTime(settings.doNotDisturb.endTime)}
                </Text>
              }
              onPress={() => {
                // TODO: Show time picker
                Alert.alert('Time Picker', 'Time picker would open here');
              }}
            />
          </>
        )}
      </SettingsSection>

      {/* Testing */}
      <SettingsSection
        title="Testing"
        description="Test your notification settings"
        icon="bug-report"
      >
        <SettingsRow
          title="Send Test Notification"
          description="Send a test push notification to verify your settings"
          icon="send"
          onPress={async () => {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Test Notification 🍔",
                  body: "Your notification settings are working correctly!",
                  data: { test: true },
                },
                trigger: { seconds: 1 },
              });
              
              Alert.alert(
                'Test Sent',
                'A test notification will appear in a moment.'
              );
            } catch (error) {
              Alert.alert(
                'Test Failed',
                'Unable to send test notification. Please check your settings.'
              );
            }
          }}
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
          <Text style={styles.infoTitle}>About Notifications</Text>
        </View>
        
        <Text style={styles.infoText}>
          We'll only send you notifications that are important to your Palate experience. 
          You can change these settings at any time, and you can always turn off specific 
          types of notifications while keeping others enabled.
        </Text>
        
        <Text style={styles.infoText}>
          Push notifications require permission from your device. If you've previously 
          denied permission, you'll need to enable it in your device settings.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${theme.colors.warning}10`,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  warningText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  timeText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
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
});

export default NotificationSettings;