import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { ProfileScreenProps } from '../navigation/types';
import { theme } from '../theme';
import uiTheme, { bottomNavHeight, spacing } from '../theme/uiTheme';
import Card from '../components/ui/Card';
import ModernCard from '../components/ui/ModernCard';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  
  // Responsive calculations
  const isSmallScreen = SCREEN_WIDTH < 375;
  const cardMargin = SCREEN_WIDTH * 0.04;
  const headerPadding = SCREEN_WIDTH * 0.05;

  const handleSignOut = () => {
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
  };

  const handleEditProfile = () => {
    console.log('Edit profile pressed');
  };

  const handleSettings = () => {
    console.log('Settings pressed');
  };

  const handleNotifications = () => {
    console.log('Notifications pressed');
  };

  const handlePrivacy = () => {
    console.log('Privacy pressed');
  };

  const handleHelp = () => {
    console.log('Help pressed');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <MaterialIcons
              name="settings"
              size={24}
              color={theme.colors.text}
              style={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info */}
        <Card variant="elevated" padding="large" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar 
              size="xl" 
              name={user?.displayName || user?.email || 'User'} 
              showStatus 
              status="online" 
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.displayName || 'Food Lover'}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email}
              </Text>
              <Text style={styles.profileBio}>
                Exploring the world, one bite at a time 🍴
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <View style={styles.editButtonIcon}>
              <MaterialIcons name="edit" size={24} color={uiTheme.colors.primary} />
            </View>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </Card>

        {/* Quick Actions */}
        <Card variant="flat" padding="medium" style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Camera')}
              accessibilityRole="button"
              accessibilityLabel="Share food"
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name="camera-alt" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionText}>Share Food</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('MyPosts')}
              accessibilityRole="button"
              accessibilityLabel="My posts"
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name="book" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionText}>My Posts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Discover')}
              accessibilityRole="button"
              accessibilityLabel="Discover friends"
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name="search" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionText}>Discover</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleNotifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name="notifications" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionText}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Settings Menu */}
        <Card variant="flat" padding="none" style={styles.menuCard}>
          <Text style={[styles.sectionTitle, { padding: theme.spacing.lg }]}>Settings</Text>
          
          {[
            { icon: 'person', title: 'Account Settings', subtitle: 'Update your profile and preferences', onPress: handleEditProfile },
            { icon: 'lock', title: 'Privacy & Security', subtitle: 'Control your privacy settings', onPress: handlePrivacy },
            { icon: 'notifications', title: 'Notifications', subtitle: 'Manage notification preferences', onPress: handleNotifications },
            { icon: 'help', title: 'Help & Support', subtitle: 'Get help and contact support', onPress: handleHelp },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <MaterialIcons
                name={item.icon as keyof typeof MaterialIcons.glyphMap}
                size={24}
                color={theme.colors.textSecondary}
                style={styles.menuIcon}
              />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </Card>

        {/* App Info */}
        <Card variant="outlined" padding="large" style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Text style={styles.appName}>Palate</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              Share your culinary adventures with friends and discover amazing food experiences.
            </Text>
          </View>
        </Card>

        {/* Sign Out */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <View style={styles.signOutIcon}>
              <MaterialIcons name="logout" size={24} color={theme.colors.error} />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: Math.max(theme.spacing.lg, SCREEN_WIDTH * 0.05),
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 0,
    ...theme.shadows.xs,
  },
  headerTitle: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize['2xl'] : theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[50],
    width: Math.max(36, theme.touchTarget.minHeight * 0.8),
    height: Math.max(36, theme.touchTarget.minHeight * 0.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: bottomNavHeight + spacing(3), // Proper bottom nav clearance
  },
  profileCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  profileName: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize['3xl'] : theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  profileEmail: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  profileBio: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize['3xl'] : theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  statDivider: {
    width: 1,
    height: SCREEN_WIDTH > 375 ? 50 : 40,
    backgroundColor: theme.colors.outline,
    marginHorizontal: theme.spacing.lg,
  },
  editButton: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[50],
    minWidth: SCREEN_WIDTH * 0.4,
  },
  editButtonIcon: {
    width: SCREEN_WIDTH > 375 ? 60 : 50,
    height: SCREEN_WIDTH > 375 ? 60 : 50,
    borderRadius: SCREEN_WIDTH > 375 ? 30 : 25,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  editButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize.xl : theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  actionItem: {
    width: (SCREEN_WIDTH - (SCREEN_WIDTH * 0.03 * 6)) / 2,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[50],
  },
  actionIcon: {
    width: SCREEN_WIDTH > 375 ? 60 : 50,
    height: SCREEN_WIDTH > 375 ? 60 : 50,
    borderRadius: SCREEN_WIDTH > 375 ? 30 : 25,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  actionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  menuCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
    backgroundColor: theme.colors.white,
  },
  menuIcon: {
    marginRight: theme.spacing.lg,
    width: 32,
    textAlign: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  menuSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  infoCard: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.xxl,
  },
  infoContent: {
    alignItems: 'center',
  },
  appName: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize['2xl'] : theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  appVersion: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  appDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  signOutContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  signOutButton: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[50],
    minWidth: SCREEN_WIDTH * 0.6,
  },
  signOutIcon: {
    width: SCREEN_WIDTH > 375 ? 60 : 50,
    height: SCREEN_WIDTH > 375 ? 60 : 50,
    borderRadius: SCREEN_WIDTH > 375 ? 30 : 25,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  signOutText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
    textAlign: 'center',
  },
});

export default ProfileScreen;