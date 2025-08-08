import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, Animated, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { HomeScreenProps } from '../navigation/types';
import { theme } from '../theme';
import uiTheme, { bottomNavHeight, spacing } from '../theme/uiTheme';
import Card from '../components/ui/Card';
import ModernCard from '../components/ui/ModernCard';
import Avatar from '../components/ui/Avatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Responsive calculations
  const isSmallScreen = SCREEN_WIDTH < 375;
  const cardMargin = SCREEN_WIDTH * 0.04; // 4% of screen width
  const headerPadding = SCREEN_WIDTH * 0.05; // 5% of screen width

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      console.log('Feed refreshed');
    }, 2000);
  }, []);

  const handleSearch = () => {
    console.log('Search pressed');
  };

  const handleQuickPost = () => {
    navigation.navigate('Camera');
  };

  const handleNotifications = () => {
    console.log('Notifications pressed');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Palate</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <MaterialIcons name="search" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <MaterialIcons name="notifications-none" size={24} color={theme.colors.text} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            title="Pull to refresh your feed"
            titleColor={theme.colors.textSecondary}
          />
        }
      >
        {/* Welcome Section */}
        <Card variant="elevated" padding="large" style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeHeader}>
              <Avatar size="md" name="You" />
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeTitle}>Welcome back!</Text>
                <Text style={styles.welcomeSubtitle}>
                  What delicious moments will you share today?
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Feed Placeholder */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>Friends Feed</Text>
          
          <Card variant="outlined" padding="large" style={styles.placeholderCard}>
            <View style={styles.placeholderContent}>
              <MaterialIcons
                name="restaurant"
                size={48}
                color={theme.colors.primary}
                style={styles.placeholderIcon}
              />
              <Text style={styles.placeholderTitle}>
                Your feed is waiting
              </Text>
              <Text style={styles.placeholderText}>
                Follow friends to see their delicious food adventures, or be the first to share yours!
              </Text>
            </View>
          </Card>

          {/* Mock Feed Items */}
          <Text style={styles.mockTitle}>Coming Soon:</Text>
          
          <Card variant="flat" padding="medium" style={styles.mockCard}>
            <View style={styles.mockItem}>
              <Avatar size="sm" name="Sarah Chen" />
              <View style={styles.mockContent}>
                <Text style={styles.mockUser}>Sarah Chen</Text>
                <Text style={styles.mockPost}>Amazing ramen at Ichiran! 🍜</Text>
                <Text style={styles.mockTime}>2 hours ago</Text>
              </View>
            </View>
          </Card>

          <Card variant="flat" padding="medium" style={styles.mockCard}>
            <View style={styles.mockItem}>
              <Avatar size="sm" name="Mike Johnson" />
              <View style={styles.mockContent}>
                <Text style={styles.mockUser}>Mike Johnson</Text>
                <Text style={styles.mockPost}>Homemade pizza night! 🍕</Text>
                <Text style={styles.mockTime}>4 hours ago</Text>
              </View>
            </View>
          </Card>

          <Card variant="flat" padding="medium" style={styles.mockCard}>
            <View style={styles.mockItem}>
              <Avatar size="sm" name="Emma Wilson" />
              <View style={styles.mockContent}>
                <Text style={styles.mockUser}>Emma Wilson</Text>
                <Text style={styles.mockPost}>Fresh sushi date night 🍣</Text>
                <Text style={styles.mockTime}>6 hours ago</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Loading State */}
        {loading && (
          <LoadingSpinner
            size="large"
            text="Loading feed..."
            style={styles.loadingSpinner}
          />
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleQuickPost}
        accessibilityRole="button"
        accessibilityLabel="Quick post"
        accessibilityHint="Tap to quickly share a food moment"
      >
        <MaterialIcons name="add" size={28} color={theme.colors.white} />
      </TouchableOpacity>
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
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize['3xl'] : theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[50],
    position: 'relative',
    width: Math.max(36, theme.touchTarget.minHeight * 0.8),
    height: Math.max(36, theme.touchTarget.minHeight * 0.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: bottomNavHeight + spacing(3), // Proper bottom nav clearance
  },
  welcomeCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  welcomeContent: {
    alignItems: 'flex-start',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  welcomeTitle: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize.xl : theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  welcomeSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  feedSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize.xl : theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  placeholderCard: {
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  placeholderIcon: {
    marginBottom: theme.spacing.xl,
    opacity: 0.6,
  },
  placeholderTitle: {
    fontSize: SCREEN_WIDTH > 375 ? theme.typography.fontSize.xl : theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  mockTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    fontStyle: 'italic',
  },
  mockCard: {
    marginBottom: theme.spacing.md,
    opacity: 0.8,
    borderRadius: theme.borderRadius.lg,
  },
  mockItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockContent: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  mockUser: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  mockPost: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  mockTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  loadingSpinner: {
    marginVertical: theme.spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: Math.max(80, SCREEN_HEIGHT * 0.11),
    right: Math.max(theme.spacing.md, SCREEN_WIDTH * 0.04),
    width: Math.max(48, SCREEN_WIDTH * 0.12),
    height: Math.max(48, SCREEN_WIDTH * 0.12),
    borderRadius: Math.max(24, SCREEN_WIDTH * 0.06),
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
    elevation: 8,
  },
});

export default HomeScreen;