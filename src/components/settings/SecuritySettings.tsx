import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { SecuritySettings as SecuritySettingsType, LoginEvent, ActiveSession } from '../../types/profile';
import { theme } from '../../theme';
import {
  SettingsSection,
  SettingsRow,
  ToggleRow,
  TextInputRow,
} from './SettingsSection';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

export interface SecuritySettingsProps {
  settings: SecuritySettingsType;
  loginHistory: LoginEvent[];
  activeSessions: ActiveSession[];
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  onUpdateSettings: (settings: Partial<SecuritySettingsType>) => Promise<void>;
  onViewLoginHistory: () => void;
  onTerminateSession: (sessionId: string) => Promise<void>;
  onTerminateAllSessions: () => Promise<void>;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  settings,
  loginHistory,
  activeSessions,
  onChangePassword,
  onUpdateSettings,
  onViewLoginHistory,
  onTerminateSession,
  onTerminateAllSessions,
  loading = false,
  onRefresh,
}) => {
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (passwordData.new.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.new)) {
      Alert.alert(
        'Weak Password',
        'Password should contain at least one uppercase letter, one lowercase letter, and one number.',
        [
          {
            text: 'Use Anyway',
            onPress: () => performPasswordChange(),
          },
          {
            text: 'Choose Stronger',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    performPasswordChange();
  };

  const performPasswordChange = async () => {
    setChangingPassword(true);

    try {
      const success = await onChangePassword(passwordData.current, passwordData.new);
      
      if (success) {
        Alert.alert(
          'Password Changed',
          'Your password has been successfully changed. You may need to log in again on other devices.'
        );
        setPasswordData({ current: '', new: '', confirm: '' });
        setShowPasswordForm(false);
        
        // Update password change date in settings
        await onUpdateSettings({
          passwordLastChanged: new Date().toISOString(),
        });
      } else {
        Alert.alert('Error', 'Failed to change password. Please check your current password.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while changing your password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSessionTermination = (session: ActiveSession) => {
    Alert.alert(
      'Terminate Session',
      `Are you sure you want to sign out from ${session.device}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => onTerminateSession(session.id),
        },
      ]
    );
  };

  const handleTerminateAllSessions = () => {
    Alert.alert(
      'Sign Out Everywhere',
      'This will sign you out from all devices except this one. You\'ll need to log in again on other devices.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: onTerminateAllSessions,
        },
      ]
    );
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  const getDeviceIcon = (device: string): keyof typeof MaterialIcons.glyphMap => {
    if (device.toLowerCase().includes('iphone') || device.toLowerCase().includes('ios')) {
      return 'phone-iphone';
    }
    if (device.toLowerCase().includes('android')) {
      return 'phone-android';
    }
    if (device.toLowerCase().includes('mac')) {
      return 'laptop-mac';
    }
    if (device.toLowerCase().includes('windows')) {
      return 'laptop-windows';
    }
    return 'devices';
  };

  const getLocationFlag = (location: string): string => {
    // Simple location to flag mapping
    if (location.includes('US') || location.includes('United States')) return '🇺🇸';
    if (location.includes('CA') || location.includes('Canada')) return '🇨🇦';
    if (location.includes('GB') || location.includes('United Kingdom')) return '🇬🇧';
    if (location.includes('DE') || location.includes('Germany')) return '🇩🇪';
    if (location.includes('FR') || location.includes('France')) return '🇫🇷';
    return '🌐';
  };

  const formatLastActive = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    } catch {
      return 'Unknown';
    }
  };

  const getSecurityScore = (): number => {
    let score = 0;
    if (settings.twoFactorEnabled) score += 30;
    if (settings.loginNotifications) score += 20;
    if (settings.suspiciousActivityAlerts) score += 20;
    if (settings.sessionTimeout <= 60) score += 15; // Stricter timeout
    if (settings.passwordLastChanged && 
        new Date().getTime() - new Date(settings.passwordLastChanged).getTime() < 90 * 24 * 60 * 60 * 1000) {
      score += 15; // Password changed in last 90 days
    }
    return Math.min(score, 100);
  };

  const securityScore = getSecurityScore();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Security Score */}
      <Card variant="elevated" padding="large" style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <View style={styles.scoreIconContainer}>
            <MaterialIcons
              name={securityScore >= 80 ? 'shield' : securityScore >= 60 ? 'verified-user' : 'security'}
              size={32}
              color={securityScore >= 80 ? theme.colors.success : securityScore >= 60 ? theme.colors.warning : theme.colors.error}
            />
          </View>
          <View style={styles.scoreText}>
            <Text style={styles.scoreTitle}>Security Score</Text>
            <Text style={[
              styles.scoreValue,
              { color: securityScore >= 80 ? theme.colors.success : securityScore >= 60 ? theme.colors.warning : theme.colors.error }
            ]}>
              {securityScore}/100
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreBar}>
          <View
            style={[
              styles.scoreProgress,
              {
                width: `${securityScore}%`,
                backgroundColor: securityScore >= 80 ? theme.colors.success : securityScore >= 60 ? theme.colors.warning : theme.colors.error,
              },
            ]}
          />
        </View>

        <Text style={styles.scoreDescription}>
          {securityScore >= 80 && 'Excellent security! Your account is well protected.'}
          {securityScore >= 60 && securityScore < 80 && 'Good security. Consider enabling more security features.'}
          {securityScore < 60 && 'Your account security could be improved. Enable more security features below.'}
        </Text>
      </Card>

      {/* Password Management */}
      <SettingsSection
        title="Password & Authentication"
        description="Manage your account password and authentication methods"
        icon="lock"
      >
        <SettingsRow
          title="Change Password"
          description={`Last changed: ${settings.passwordLastChanged ? 
            format(new Date(settings.passwordLastChanged), 'MMM d, yyyy') : 'Never'}`}
          icon="key"
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        />

        {showPasswordForm && (
          <Card variant="flat" padding="medium" style={styles.passwordForm}>
            <TextInputRow
              title="Current Password"
              icon="lock"
              value={passwordData.current}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, current: text }))}
              placeholder="Enter current password"
              secureTextEntry
            />

            <TextInputRow
              title="New Password"
              icon="lock-open"
              value={passwordData.new}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, new: text }))}
              placeholder="Enter new password (min 8 characters)"
              secureTextEntry
            />

            <TextInputRow
              title="Confirm New Password"
              icon="lock"
              value={passwordData.confirm}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirm: text }))}
              placeholder="Confirm new password"
              secureTextEntry
            />

            <View style={styles.passwordActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowPasswordForm(false);
                  setPasswordData({ current: '', new: '', confirm: '' });
                }}
                style={styles.passwordButton}
              />
              
              <Button
                title="Change Password"
                variant="primary"
                onPress={handlePasswordChange}
                loading={changingPassword}
                disabled={!passwordData.current || !passwordData.new || !passwordData.confirm}
                style={styles.passwordButton}
              />
            </View>
          </Card>
        )}

        <ToggleRow
          title="Two-Factor Authentication"
          description={settings.twoFactorEnabled ? "Extra security enabled" : "Add extra security with 2FA"}
          icon="verified-user"
          value={settings.twoFactorEnabled}
          onValueChange={(value) => onUpdateSettings({ twoFactorEnabled: value })}
        />
      </SettingsSection>

      {/* Security Preferences */}
      <SettingsSection
        title="Security Preferences"
        description="Configure security alerts and session management"
        icon="tune"
      >
        <ToggleRow
          title="Login Notifications"
          description="Get notified when someone logs into your account"
          icon="notifications-active"
          value={settings.loginNotifications}
          onValueChange={(value) => onUpdateSettings({ loginNotifications: value })}
        />

        <ToggleRow
          title="Suspicious Activity Alerts"
          description="Get alerts for unusual account activity"
          icon="warning"
          value={settings.suspiciousActivityAlerts}
          onValueChange={(value) => onUpdateSettings({ suspiciousActivityAlerts: value })}
        />

        <SettingsRow
          title="Session Timeout"
          description={`Auto sign-out after ${settings.sessionTimeout} minutes of inactivity`}
          icon="timer"
          onPress={() => {
            Alert.alert(
              'Session Timeout',
              'Choose when to automatically sign out due to inactivity:',
              [
                { text: '15 minutes', onPress: () => onUpdateSettings({ sessionTimeout: 15 }) },
                { text: '30 minutes', onPress: () => onUpdateSettings({ sessionTimeout: 30 }) },
                { text: '60 minutes', onPress: () => onUpdateSettings({ sessionTimeout: 60 }) },
                { text: '2 hours', onPress: () => onUpdateSettings({ sessionTimeout: 120 }) },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        />
      </SettingsSection>

      {/* Active Sessions */}
      <SettingsSection
        title="Active Sessions"
        description="Manage devices signed into your account"
        icon="devices"
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        ) : (
          <>
            {activeSessions.map((session) => (
              <Card key={session.id} variant="flat" padding="medium" style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <MaterialIcons
                    name={getDeviceIcon(session.device)}
                    size={24}
                    color={session.current ? theme.colors.success : theme.colors.textSecondary}
                  />
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionTitleRow}>
                      <Text style={styles.sessionDevice}>{session.device}</Text>
                      {session.current && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sessionLocation}>
                      {getLocationFlag(session.location)} {session.location}
                    </Text>
                    <Text style={styles.sessionTime}>
                      Last active: {formatLastActive(session.lastActive)}
                    </Text>
                  </View>
                  
                  {!session.current && (
                    <TouchableOpacity
                      style={styles.terminateButton}
                      onPress={() => handleSessionTermination(session)}
                    >
                      <MaterialIcons name="close" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))}

            {activeSessions.length > 1 && (
              <Button
                title="Sign Out All Other Devices"
                variant="error"
                onPress={handleTerminateAllSessions}
                style={styles.terminateAllButton}
                leftIcon={
                  <MaterialIcons name="exit-to-app" size={18} color={theme.colors.white} />
                }
              />
            )}
          </>
        )}
      </SettingsSection>

      {/* Recent Activity */}
      <SettingsSection
        title="Recent Login Activity"
        description="Review recent sign-in attempts"
        icon="history"
      >
        {loginHistory.slice(0, 5).map((login) => (
          <Card key={login.id} variant="flat" padding="small" style={styles.loginCard}>
            <View style={styles.loginHeader}>
              <MaterialIcons
                name={login.success ? 'check-circle' : 'error'}
                size={20}
                color={login.success ? theme.colors.success : theme.colors.error}
              />
              <View style={styles.loginInfo}>
                <Text style={styles.loginDevice}>{login.device}</Text>
                <Text style={styles.loginLocation}>
                  {getLocationFlag(login.location)} {login.location}
                </Text>
              </View>
              <Text style={styles.loginTime}>
                {format(new Date(login.timestamp), 'MMM d, h:mm a')}
              </Text>
            </View>
          </Card>
        ))}

        <SettingsRow
          title="View Full Login History"
          description="See all login attempts and activity"
          icon="list"
          onPress={onViewLoginHistory}
        />
      </SettingsSection>

      {/* Security Resources */}
      <SettingsSection
        title="Security Resources"
        description="Learn about staying secure"
        icon="help"
      >
        <SettingsRow
          title="Security Best Practices"
          description="Learn how to keep your account secure"
          icon="school"
          onPress={() => Alert.alert('Security Tips', 'Coming soon: Security best practices guide.')}
        />

        <SettingsRow
          title="Report Security Issue"
          description="Report a security vulnerability or concern"
          icon="report"
          onPress={() => Alert.alert('Security Report', 'Contact security@palate-app.com to report issues.')}
        />
      </SettingsSection>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scoreCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  scoreIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  scoreText: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  scoreValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
  },
  scoreBar: {
    height: 8,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 4,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  passwordForm: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  passwordButton: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  sessionCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xs,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sessionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  sessionDevice: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
  },
  currentBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  currentBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.medium,
  },
  sessionLocation: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  sessionTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  terminateButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.error}10`,
  },
  terminateAllButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  loginCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xs,
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  loginDevice: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
  },
  loginLocation: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  loginTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});

export default SecuritySettings;