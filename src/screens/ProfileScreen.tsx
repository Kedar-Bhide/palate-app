import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { ProfileScreenProps } from '../navigation/types';
import { theme } from '../theme';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

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

          <Button
            variant="outline"
            size="medium"
            onPress={handleEditProfile}
            style={styles.editButton}
            icon={<MaterialIcons name="edit" size={20} color={theme.colors.primary} />}
          >
            Edit Profile
          </Button>
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
          <Button
            variant="outline"
            size="large"
            onPress={handleSignOut}
            style={styles.signOutButton}
            textStyle={styles.signOutText}
          >
            Sign Out
          </Button>
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
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  profileCard: {
    marginBottom: theme.spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  profileName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  profileEmail: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  profileBio: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.outline,
    marginHorizontal: theme.spacing.md,
  },
  editButton: {
    alignSelf: 'center',
    minWidth: 150,
  },
  actionsCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  menuCard: {
    marginBottom: theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  menuIcon: {
    marginRight: theme.spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  menuSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
  },
  infoContent: {
    alignItems: 'center',
  },
  appName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  appVersion: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  appDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  signOutContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  signOutButton: {
    borderColor: theme.colors.error,
    minWidth: 200,
  },
  signOutText: {
    color: theme.colors.error,
  },
});

export default ProfileScreen;