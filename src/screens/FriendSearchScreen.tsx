import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../hooks/useFriends';
import { Input } from '../components/ui/Input';
import UserCard from '../components/friends/UserCard';
import { FriendAction, SearchResult, FriendSuggestion } from '../types/friends';
import { colors, spacing, radii, fonts, shadows } from '../theme/uiTheme';

export default function FriendSearchScreen() {
  const navigation = useNavigation();
  const {
    searchResults,
    searchHistory,
    suggestedUsers,
    searchLoading,
    loading,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockUser,
    clearSearchHistory,
    refreshSuggestions,
    setSearchResults,
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'suggestions' | 'results' | 'history'>('suggestions');

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery);
      setActiveSection('results');
    } else {
      setSearchResults([]);
      setActiveSection(searchHistory.length > 0 ? 'history' : 'suggestions');
    }
  }, [searchQuery, searchUsers, setSearchResults, searchHistory.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSuggestions();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshSuggestions]);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('UserProfile' as never, { userId } as never);
  }, [navigation]);

  const handleFriendAction = useCallback(async (userId: string, action: FriendAction) => {
    try {
      switch (action) {
        case 'add_friend':
          await sendFriendRequest(userId);
          Alert.alert('Success', 'Friend request sent!');
          break;
        case 'accept_request':
          await acceptFriendRequest(userId);
          Alert.alert('Success', 'Friend request accepted!');
          break;
        case 'decline_request':
          await declineFriendRequest(userId);
          break;
        case 'remove_friend':
          await removeFriend(userId);
          Alert.alert('Success', 'Friend removed.');
          break;
        case 'block_user':
          await blockUser(userId);
          Alert.alert('Success', 'User blocked.');
          break;
      }
    } catch (error) {
      console.error('Friend action error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, blockUser]);

  const handleHistoryItemPress = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear your search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearSearchHistory }
      ]
    );
  }, [clearSearchHistory]);

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Input
        variant="outlined"
        placeholder="Search by username, name, or email..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon={
          <Ionicons 
            name="search" 
            size={20} 
            color={searchLoading ? colors.primary : colors.textSecondary} 
          />
        }
        rightIcon={
          searchQuery ? (
            <Ionicons 
              name="close-circle" 
              size={20} 
              color={colors.textSecondary} 
            />
          ) : undefined
        }
        onRightIconPress={searchQuery ? () => setSearchQuery('') : undefined}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  const renderSectionHeader = (title: string, count?: number, onAction?: () => void, actionText?: string) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && (
          <Text style={styles.sectionCount}>
            {count} {count === 1 ? 'result' : 'results'}
          </Text>
        )}
      </View>
      {onAction && actionText && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchQuery && searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🔍</Text>
          <Text style={styles.emptyStateTitle}>No users found</Text>
          <Text style={styles.emptyStateMessage}>
            Try searching with a different username, name, or email.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        {searchResults.map((result: SearchResult) => (
          <UserCard
            key={result.user.id}
            user={result.user}
            currentUserId="" // This will be filled by the hook
            friendshipStatus={result.friendship_status}
            mutualFriendsCount={result.mutual_friends_count}
            onPress={handleUserPress}
            onFriendAction={handleFriendAction}
            showActivity
          />
        ))}
      </View>
    );
  };

  const renderSearchHistory = () => {
    if (searchHistory.length === 0) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader(
          'Recent Searches', 
          undefined, 
          handleClearHistory, 
          'Clear'
        )}
        <View style={styles.historyContainer}>
          {searchHistory.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => handleHistoryItemPress(item.query)}
            >
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.historyText}>{item.query}</Text>
              <Ionicons name="arrow-up-left" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderSuggestedUsers = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading suggestions...</Text>
        </View>
      );
    }

    if (suggestedUsers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>👋</Text>
          <Text style={styles.emptyStateTitle}>No suggestions yet</Text>
          <Text style={styles.emptyStateMessage}>
            Follow more friends to get personalized suggestions!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.suggestionsContainer}>
        {suggestedUsers.map((suggestion: FriendSuggestion) => (
          <View key={suggestion.user.id} style={styles.suggestionItem}>
            <UserCard
              user={suggestion.user}
              currentUserId="" // This will be filled by the hook
              friendshipStatus="none"
              mutualFriendsCount={suggestion.mutual_friends_count}
              onPress={handleUserPress}
              onFriendAction={handleFriendAction}
            />
            <View style={styles.suggestionReason}>
              <Text style={styles.reasonText}>{suggestion.reason_text}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(suggestion.confidence_score * 100)}% match
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (activeSection === 'results') {
      return (
        <View style={styles.section}>
          {renderSectionHeader('Search Results', searchResults.length)}
          {renderSearchResults()}
        </View>
      );
    }

    if (activeSection === 'history' && searchHistory.length > 0) {
      return renderSearchHistory();
    }

    return (
      <View style={styles.section}>
        {renderSectionHeader('Suggested for You', suggestedUsers.length)}
        {renderSuggestedUsers()}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Find Friends</Text>
          <Text style={styles.headerSubtitle}>
            Discover food lovers to connect with
          </Text>
        </View>
      </View>

      {renderSearchBar()}

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
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  backButton: {
    marginRight: spacing(1.5),
    padding: spacing(0.5),
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    marginTop: spacing(0.25),
  },

  searchContainer: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  searchInput: {
    marginBottom: 0,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing(4),
  },

  section: {
    marginBottom: spacing(2),
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },

  sectionCount: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
  },

  sectionAction: {
    fontSize: fonts.sm,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
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

  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: spacing(2),
  },

  emptyStateTitle: {
    fontSize: fonts.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: fonts.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.4,
  },

  resultsContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing(2),
  },

  historyContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing(1),
  },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    gap: spacing(1.5),
  },

  historyText: {
    flex: 1,
    fontSize: fonts.base,
    color: colors.text,
  },

  suggestionsContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing(2),
  },

  suggestionItem: {
    marginBottom: spacing(1.5),
  },

  suggestionReason: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing(0.75),
    marginHorizontal: spacing(1),
  },

  reasonText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    flex: 1,
  },

  confidenceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },

  confidenceText: {
    fontSize: fonts.xs,
    color: colors.primary,
    fontWeight: fonts.weights.medium,
  },
});