import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { HomeScreenProps } from '../navigation/types';
import { theme } from '../theme';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

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
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  welcomeCard: {
    marginBottom: theme.spacing.lg,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  welcomeTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
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
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  placeholderCard: {
    marginBottom: theme.spacing.xl,
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  placeholderIcon: {
    marginBottom: theme.spacing.md,
  },
  placeholderTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    maxWidth: 280,
  },
  mockTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  mockCard: {
    marginBottom: theme.spacing.md,
    opacity: 0.7,
  },
  mockItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
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
    marginBottom: theme.spacing.xs,
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
    bottom: 100, // Above tab bar
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
    elevation: 8,
  },
});

export default HomeScreen;