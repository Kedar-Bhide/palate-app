/**
 * Find Friends Screen - Onboarding Screen 4/5
 * Friend discovery and connection during onboarding
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';
import FriendCard from '../../components/onboarding/FriendCard';
import Input from '../../components/ui/Input';
import { colors, spacing, fonts } from '../../theme/uiTheme';
import { useOnboarding } from '../../hooks/useOnboarding';
import { MockFriend, getFriendSuggestions, searchFriends } from '../../data/mockFriends';

interface FindFriendsScreenProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  canProceed: boolean;
}

export default function FindFriendsScreen({ 
  onNext, 
  onPrevious, 
  onSkip 
}: FindFriendsScreenProps) {
  const { currentStep, totalSteps } = useOnboarding();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<MockFriend[]>([]);
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());

  // Initialize friend suggestions
  useEffect(() => {
    setFriends(getFriendSuggestions());
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const results = searchFriends(searchQuery);
      setFriends(results);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddFriend = (friendId: string) => {
    setAddedFriends(prev => new Set([...prev, friendId]));
    setFriends(prev => 
      prev.map(friend => 
        friend.id === friendId 
          ? { ...friend, isAdded: true }
          : friend
      )
    );
  };

  const handleRemoveFriend = (friendId: string) => {
    setAddedFriends(prev => {
      const newSet = new Set(prev);
      newSet.delete(friendId);
      return newSet;
    });
    setFriends(prev => 
      prev.map(friend => 
        friend.id === friendId 
          ? { ...friend, isAdded: false }
          : friend
      )
    );
  };

  const handleContinue = () => {
    // Save added friends to onboarding data (placeholder)
    console.log('Added friends:', Array.from(addedFriends));
    onNext();
  };

  // Friend discovery illustration
  const FriendDiscoveryIllustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.searchIconContainer}>
        <MaterialIcons name="people" size={60} color={colors.primary} />
        <View style={styles.searchOverlay}>
          <MaterialIcons name="search" size={20} color={colors.background} />
        </View>
      </View>
      
      <View style={styles.connectionLines}>
        {/* Decorative connection dots */}
        <View style={[styles.connectionDot, styles.dot1]} />
        <View style={[styles.connectionDot, styles.dot2]} />
        <View style={[styles.connectionDot, styles.dot3]} />
      </View>
    </View>
  );

  // Friend search and list content
  const FriendSearchContent = () => {
    const renderFriend: ListRenderItem<MockFriend> = ({ item }) => (
      <FriendCard
        name={item.name}
        username={item.username}
        initials={item.initials}
        avatar={item.avatar}
        mutualFriends={item.mutualFriends}
        isAdded={addedFriends.has(item.id)}
        onAddFriend={() => handleAddFriend(item.id)}
        onRemoveFriend={() => handleRemoveFriend(item.id)}
      />
    );

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.description}>
          Friends make food discoveries more fun!
        </Text>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search by username or email"
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={
              <MaterialIcons name="search" size={20} color={colors.textSecondary} />
            }
            style={styles.searchInput}
          />
        </View>

        {/* Friend Suggestions */}
        <View style={styles.friendsListContainer}>
          {addedFriends.size > 0 && (
            <Text style={styles.addedFriendsText}>
              {addedFriends.size} friend{addedFriends.size > 1 ? 's' : ''} added
            </Text>
          )}

          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.friendsList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'No friends found' : 'Loading suggestions...'}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    );
  };

  return (
    <OnboardingSlide
      title="Find your foodie friends"
      subtitle="Connect with friends to see their culinary adventures"
      illustration={<FriendDiscoveryIllustration />}
      content={<FriendSearchContent />}
      primaryButton={{
        title: "Continue",
        onPress: handleContinue,
      }}
      secondaryButton={{
        title: "Skip for now",
        onPress: onSkip,
      }}
      currentStep={currentStep}
      totalSteps={totalSteps}
    />
  );
}

const styles = StyleSheet.create({
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
    position: 'relative',
  },

  searchIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  searchOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },

  connectionLines: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  connectionDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },

  dot1: {
    top: 40,
    left: 30,
    opacity: 0.6,
  },

  dot2: {
    top: 70,
    right: 40,
    opacity: 0.4,
  },

  dot3: {
    bottom: 50,
    left: 50,
    opacity: 0.3,
  },

  contentContainer: {
    flex: 1,
    paddingVertical: spacing(2),
  },

  description: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fonts.base * 1.5,
    marginBottom: spacing(3),
    paddingHorizontal: spacing(2),
  },

  searchContainer: {
    paddingHorizontal: spacing(3),
    marginBottom: spacing(3),
  },

  searchInput: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.outline,
  },

  friendsListContainer: {
    flex: 1,
    minHeight: 300,
  },

  addedFriendsText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing(2),
  },

  friendsList: {
    paddingBottom: spacing(2),
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(4),
  },

  emptyStateText: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.normal,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing(2),
  },
});