import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { MyPostsScreenProps } from '../navigation/types';
import { theme } from '../theme';
import uiTheme, { bottomNavHeight, spacing } from '../theme/uiTheme';
import EmptyState from '../components/ui/EmptyState';
import Card from '../components/ui/Card';
import ModernCard from '../components/ui/ModernCard';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MyPostsScreen: React.FC<MyPostsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleCreatePost = () => {
    navigation.navigate('Camera');
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>My Food Journey</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleViewMode}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            <MaterialIcons
              name={viewMode === 'grid' ? 'view-list' : 'view-module'}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="filter-list" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Stats Card */}
        <Card variant="elevated" padding="large" style={styles.statsCard}>
          <View style={styles.userHeader}>
            <Avatar size="lg" name="You" />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Your Food Journey</Text>
              <Text style={styles.userSubtitle}>Share your delicious moments</Text>
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
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card variant="flat" padding="medium" style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <Button
              variant="primary"
              size="medium"
              onPress={handleCreatePost}
              style={styles.actionButton}
              icon={<MaterialIcons name="camera-alt" size={20} color={theme.colors.white} />}
            >
              Share Food
            </Button>
            <Button
              variant="primary"
              size="medium"
              onPress={handleViewProfile}
              style={styles.actionButton}
              icon={<MaterialIcons name="person" size={20} color={uiTheme.colors.white} />}
            >
              Edit Profile
            </Button>
          </View>
        </Card>

        {/* Empty State */}
        <View style={styles.emptyStateContainer}>
          <EmptyState
            icon={
              <MaterialIcons
                name="photo-camera"
                size={64}
                color={theme.colors.gray[400]}
              />
            }
            title="No posts yet"
            description="Start your food journey by sharing your first delicious moment! Tap the camera button below or use the Share Food button above."
            action={{
              title: "Take Your First Photo",
              onPress: handleCreatePost,
              variant: "primary",
            }}
            secondaryAction={{
              title: "Browse Discover",
              onPress: () => navigation.navigate('Discover'),
              variant: "ghost",
            }}
          />
        </View>

        {/* Coming Soon Preview */}
        <Card variant="outlined" padding="large" style={styles.previewCard}>
          <Text style={styles.previewTitle}>Coming Soon</Text>
          <View style={styles.previewContent}>
            <MaterialIcons
              name="grid-view"
              size={48}
              color={theme.colors.primary}
              style={styles.previewIcon}
            />
            <Text style={styles.previewText}>
              Your food photos will be displayed in a beautiful grid layout
            </Text>
            
            {/* Mock Grid Preview */}
            <View style={styles.mockGrid}>
              <View style={styles.mockGridItem} />
              <View style={styles.mockGridItem} />
              <View style={styles.mockGridItem} />
              <View style={styles.mockGridItem} />
              <View style={styles.mockGridItem} />
              <View style={styles.mockGridItem} />
            </View>
          </View>
        </Card>
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
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: bottomNavHeight + spacing(3),
  },
  statsCard: {
    marginBottom: theme.spacing.lg,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
  actionsCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  emptyStateContainer: {
    marginBottom: theme.spacing.xl,
  },
  previewCard: {
    marginBottom: theme.spacing.xl,
    opacity: 0.8,
  },
  previewTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  previewContent: {
    alignItems: 'center',
  },
  previewIcon: {
    marginBottom: theme.spacing.md,
  },
  previewText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    maxWidth: 250,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  mockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 200,
  },
  mockGridItem: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
});

export default MyPostsScreen;