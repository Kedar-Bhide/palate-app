import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../../hooks/useFriends';
import UserCard from './UserCard';
import { FriendSuggestion, FriendAction } from '../../types/friends';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface FriendSuggestionsProps {
  onUserPress: (userId: string) => void;
  maxSuggestions?: number;
  showReasonDetails?: boolean;
  compact?: boolean;
}

type SuggestionCategory = 'all' | 'mutual_friends' | 'cuisine_similarity' | 'location' | 'recent_activity';

export default function FriendSuggestions({
  onUserPress,
  maxSuggestions = 20,
  showReasonDetails = true,
  compact = false,
}: FriendSuggestionsProps) {
  const {
    suggestedUsers,
    loading,
    sendFriendRequest,
    refreshData,
  } = useFriends();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SuggestionCategory>('all');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleSendFriendRequest = useCallback(async (userId: string, userName: string) => {
    try {
      setActionLoading(userId);
      await sendFriendRequest(userId);
      Alert.alert('Success', `Friend request sent to ${userName}! 🎉`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [sendFriendRequest]);

  const handleFriendAction = useCallback(async (userId: string, action: FriendAction) => {
    if (action === 'add_friend') {
      const suggestion = suggestedUsers.find(s => s.user.id === userId);
      if (suggestion) {
        handleSendFriendRequest(userId, suggestion.user.display_name);
      }
    }
  }, [suggestedUsers, handleSendFriendRequest]);

  const handleDismissSuggestion = useCallback((userId: string, userName: string) => {
    Alert.alert(
      'Dismiss Suggestion',
      `Hide ${userName} from friend suggestions? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => {
            setDismissedSuggestions(prev => [...prev, userId]);
          }
        }
      ]
    );
  }, []);

  const filteredSuggestions = useMemo(() => {
    let filtered = suggestedUsers.filter(suggestion => 
      !dismissedSuggestions.includes(suggestion.user.id)
    );

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.reason === activeCategory);
    }

    // Sort by confidence score
    filtered.sort((a, b) => b.confidence_score - a.confidence_score);

    return filtered.slice(0, maxSuggestions);
  }, [suggestedUsers, dismissedSuggestions, activeCategory, maxSuggestions]);

  const suggestionCategories = useMemo(() => {
    const categories = [
      { id: 'all', label: 'All', count: suggestedUsers.length },
      { id: 'mutual_friends', label: 'Mutual Friends', count: 0 },
      { id: 'cuisine_similarity', label: 'Similar Taste', count: 0 },
      { id: 'location', label: 'Nearby', count: 0 },
      { id: 'recent_activity', label: 'Active', count: 0 },
    ];

    // Count suggestions by reason
    suggestedUsers.forEach(suggestion => {
      const category = categories.find(c => c.id === suggestion.reason);
      if (category) {
        category.count++;
      }
    });

    return categories.filter(c => c.count > 0 || c.id === 'all');
  }, [suggestedUsers]);

  const getReasonIcon = (reason: FriendSuggestion['reason']) => {
    switch (reason) {
      case 'mutual_friends':
        return { name: 'people', color: colors.primary };
      case 'cuisine_similarity':
        return { name: 'restaurant', color: colors.success };
      case 'location':
        return { name: 'location', color: colors.info };
      case 'recent_activity':
        return { name: 'pulse', color: colors.accent };
      default:
        return { name: 'bulb', color: colors.warning };
    }
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return { label: 'Excellent Match', color: colors.success };
    if (score >= 0.6) return { label: 'Good Match', color: colors.primary };
    if (score >= 0.4) return { label: 'Possible Match', color: colors.warning };
    return { label: 'Low Match', color: colors.textSecondary };
  };

  const renderCategoryTabs = () => {
    if (compact || suggestionCategories.length <= 1) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {suggestionCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              activeCategory === category.id && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory(category.id as SuggestionCategory)}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === category.id && styles.categoryTabTextActive,
              ]}
            >
              {category.label}
            </Text>
            {category.count > 0 && (
              <View
                style={[
                  styles.categoryBadge,
                  activeCategory === category.id && styles.categoryBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryBadgeText,
                    activeCategory === category.id && styles.categoryBadgeTextActive,
                  ]}
                >
                  {category.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderSuggestionReason = (suggestion: FriendSuggestion) => {
    if (!showReasonDetails) return null;

    const reasonIcon = getReasonIcon(suggestion.reason);
    const confidence = getConfidenceLevel(suggestion.confidence_score);

    return (
      <View style={styles.reasonContainer}>
        <View style={styles.reasonHeader}>
          <Ionicons name={reasonIcon.name as any} size={16} color={reasonIcon.color} />
          <Text style={[styles.reasonText, { color: reasonIcon.color }]}>
            {suggestion.reason_text}
          </Text>
        </View>
        
        {suggestion.mutual_friends_count > 0 && (
          <Text style={styles.mutualFriendsText}>
            {suggestion.mutual_friends_count} mutual friend{suggestion.mutual_friends_count !== 1 ? 's' : ''}
          </Text>
        )}
        
        <View style={styles.confidenceContainer}>
          <View style={[styles.confidenceIndicator, { backgroundColor: confidence.color }]} />
          <Text style={[styles.confidenceText, { color: confidence.color }]}>
            {confidence.label}
          </Text>
        </View>
      </View>
    );
  };

  const renderSuggestionActions = (suggestion: FriendSuggestion) => (
    <View style={styles.suggestionActions}>
      <TouchableOpacity
        style={[
          styles.addFriendButton,
          actionLoading === suggestion.user.id && styles.disabledButton
        ]}
        onPress={() => handleSendFriendRequest(suggestion.user.id, suggestion.user.display_name)}
        disabled={actionLoading === suggestion.user.id}
      >
        <Ionicons name="person-add" size={16} color={colors.white} />
        <Text style={styles.addFriendButtonText}>
          {actionLoading === suggestion.user.id ? 'Sending...' : 'Add Friend'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dismissButton}
        onPress={() => handleDismissSuggestion(suggestion.user.id, suggestion.user.display_name)}
      >
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderSuggestionsList = () => {
    if (loading && suggestedUsers.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Finding great people for you to connect with...</Text>
        </View>
      );
    }

    if (filteredSuggestions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="bulb-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>
            {dismissedSuggestions.length > 0 ? 'No more suggestions' : 'No suggestions yet'}
          </Text>
          <Text style={styles.emptyStateMessage}>
            {dismissedSuggestions.length > 0
              ? 'You\'ve seen all our current suggestions. Check back later for more!'
              : 'We\'re analyzing your activity to find great people for you to connect with.'}
          </Text>
          {dismissedSuggestions.length > 0 && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setDismissedSuggestions([])}
            >
              <Text style={styles.resetButtonText}>Show dismissed suggestions</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.suggestionsList}>
        {filteredSuggestions.map((suggestion: FriendSuggestion) => (
          <View key={suggestion.user.id} style={styles.suggestionItem}>
            <UserCard
              user={suggestion.user}
              currentUserId="" // Filled by hook
              friendshipStatus="none"
              onPress={onUserPress}
              onFriendAction={handleFriendAction}
              size={compact ? "small" : "medium"}
              showActivity={false}
            />
            
            {renderSuggestionReason(suggestion)}
            {renderSuggestionActions(suggestion)}
          </View>
        ))}
      </View>
    );
  };

  const renderHeader = () => {
    if (compact) return null;

    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bulb" size={24} color={colors.warning} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Friend Suggestions</Text>
            <Text style={styles.headerSubtitle}>
              Discover people you might know
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {renderCategoryTabs()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderSuggestionsList()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerTextContainer: {
    marginLeft: spacing(1.5),
  },

  headerTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  refreshButton: {
    padding: spacing(0.5),
  },

  categoryScrollContent: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    marginRight: spacing(1),
    borderRadius: radii.full,
    backgroundColor: colors.surfaceVariant,
    gap: spacing(0.5),
  },

  categoryTabActive: {
    backgroundColor: colors.primaryLight,
  },

  categoryTabText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textSecondary,
  },

  categoryTabTextActive: {
    color: colors.primary,
  },

  categoryBadge: {
    backgroundColor: colors.white,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(0.5),
  },

  categoryBadgeActive: {
    backgroundColor: colors.primary,
  },

  categoryBadgeText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.bold,
    color: colors.textSecondary,
  },

  categoryBadgeTextActive: {
    color: colors.white,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  loadingContainer: {
    paddingVertical: spacing(4),
    alignItems: 'center',
  },

  loadingText: {
    fontSize: fonts.base,
    color: colors.textSecondary,
  },

  emptyState: {
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
  },

  emptyStateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
    marginBottom: spacing(2),
  },

  resetButton: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },

  resetButtonText: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },

  suggestionsList: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginTop: spacing(1),
    borderRadius: radii.lg,
    overflow: 'hidden',
  },

  suggestionItem: {
    padding: spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  reasonContainer: {
    marginTop: spacing(1.5),
    paddingTop: spacing(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(0.75),
    gap: spacing(0.5),
  },

  reasonText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.medium,
  },

  mutualFriendsText: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    marginBottom: spacing(0.75),
  },

  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },

  confidenceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  confidenceText: {
    fontSize: fonts.xs,
    fontWeight: fonts.weights.medium,
  },

  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing(1.5),
  },

  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    gap: spacing(0.5),
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing(1),
  },

  addFriendButtonText: {
    color: colors.white,
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
  },

  dismissButton: {
    padding: spacing(1),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
  },

  disabledButton: {
    opacity: 0.6,
  },
});