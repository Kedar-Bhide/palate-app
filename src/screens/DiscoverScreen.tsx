import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { DiscoverScreenProps } from '../navigation/types';
import { theme } from '../theme';
import uiTheme, { bottomNavHeight, spacing } from '../theme/uiTheme';
import Card from '../components/ui/Card';
import ModernCard from '../components/ui/ModernCard';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Placeholder for search functionality
    console.log('Searching for:', query);
  };

  const handleFollowUser = (userName: string) => {
    console.log('Following user:', userName);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.headerActions}>
          <MaterialIcons
            name="filter-list"
            size={24}
            color={theme.colors.text}
            style={styles.headerIcon}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Input
            variant="filled"
            placeholder="Search for friends, cuisines, or restaurants..."
            value={searchQuery}
            onChangeText={handleSearch}
            leftIcon={<MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />}
            style={styles.searchInput}
          />
        </View>

        {/* Quick Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            {['All', 'Friends', 'Restaurants', 'Cuisines', 'Near Me', 'Trending'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  filter === 'All' && styles.filterChipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${filter}`}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === 'All' && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Suggested Friends */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Suggested Friends</Text>
          
          {/* Friend Suggestions */}
          {[
            { name: 'Sarah Chen', mutual: '5 mutual friends', cuisine: 'Asian cuisine enthusiast' },
            { name: 'Mike Rodriguez', mutual: '3 mutual friends', cuisine: 'Pizza lover' },
            { name: 'Emma Thompson', mutual: '8 mutual friends', cuisine: 'Vegan foodie' },
            { name: 'James Wilson', mutual: '2 mutual friends', cuisine: 'BBQ master' },
          ].map((user, index) => (
            <Card key={index} variant="flat" padding="medium" style={styles.userCard}>
              <View style={styles.userRow}>
                <Avatar size="md" name={user.name} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userMutual}>{user.mutual}</Text>
                  <Text style={styles.userBio}>{user.cuisine}</Text>
                </View>
                <Button
                  variant="primary"
                  size="small"
                  onPress={() => handleFollowUser(user.name)}
                >
                  Follow
                </Button>
              </View>
            </Card>
          ))}
        </View>

        {/* Popular Cuisines */}
        <View style={styles.cuisinesSection}>
          <Text style={styles.sectionTitle}>Popular Cuisines</Text>
          <View style={styles.cuisineGrid}>
            {[
              { name: 'Italian', icon: '🍝', posts: '2.3k posts' },
              { name: 'Japanese', icon: '🍣', posts: '1.8k posts' },
              { name: 'Mexican', icon: '🌮', posts: '1.5k posts' },
              { name: 'Indian', icon: '🍛', posts: '1.2k posts' },
              { name: 'French', icon: '🥐', posts: '900 posts' },
              { name: 'Thai', icon: '🍜', posts: '800 posts' },
            ].map((cuisine, index) => (
              <TouchableOpacity
                key={index}
                style={styles.cuisineCard}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${cuisine.name} cuisine`}
              >
                <Text style={styles.cuisineIcon}>{cuisine.icon}</Text>
                <Text style={styles.cuisineName}>{cuisine.name}</Text>
                <Text style={styles.cuisinePosts}>{cuisine.posts}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trending Now */}
        <View style={styles.trendingSection}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          
          <Card variant="outlined" padding="large" style={styles.trendingCard}>
            <View style={styles.trendingContent}>
              <MaterialIcons
                name="trending-up"
                size={48}
                color={theme.colors.primary}
                style={styles.trendingIcon}
              />
              <Text style={styles.trendingTitle}>#BrunchGoals</Text>
              <Text style={styles.trendingDescription}>
                Join the weekend brunch trend! Share your favorite brunch spots and dishes.
              </Text>
              <Text style={styles.trendingStats}>1,234 posts today</Text>
            </View>
          </Card>
        </View>

        {/* Coming Soon */}
        <Card variant="elevated" padding="large" style={styles.comingSoonCard}>
          <View style={styles.comingSoonContent}>
            <MaterialIcons
              name="explore"
              size={48}
              color={theme.colors.secondary}
              style={styles.comingSoonIcon}
            />
            <Text style={styles.comingSoonTitle}>More Discovery Features Coming Soon!</Text>
            <Text style={styles.comingSoonText}>
              • Location-based restaurant discovery{'\n'}
              • Cuisine recommendation engine{'\n'}
              • Friend activity feed{'\n'}
              • Group dining coordination
            </Text>
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
  headerIcon: {
    marginLeft: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: bottomNavHeight + spacing(3),
  },
  searchSection: {
    marginBottom: theme.spacing.lg,
  },
  searchInput: {
    marginBottom: 0,
  },
  filtersSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  filtersScroll: {
    marginHorizontal: -theme.spacing.lg,
  },
  filtersContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  suggestionsSection: {
    marginBottom: theme.spacing.xl,
  },
  userCard: {
    marginBottom: theme.spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userMutual: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  userBio: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  cuisinesSection: {
    marginBottom: theme.spacing.xl,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cuisineCard: {
    width: '48%',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  cuisineIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  cuisineName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cuisinePosts: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  trendingSection: {
    marginBottom: theme.spacing.xl,
  },
  trendingCard: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  trendingContent: {
    alignItems: 'center',
  },
  trendingIcon: {
    marginBottom: theme.spacing.md,
  },
  trendingTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  trendingDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  trendingStats: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  comingSoonCard: {
    marginBottom: theme.spacing.xl,
    opacity: 0.8,
  },
  comingSoonContent: {
    alignItems: 'center',
  },
  comingSoonIcon: {
    marginBottom: theme.spacing.md,
  },
  comingSoonTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'left',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
});

export default DiscoverScreen;