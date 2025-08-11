import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { useFriends } from '../../hooks/useFriends';
import UserCard from './UserCard';
import { User, FriendAction, MutualFriend } from '../../types/friends';
import { colors, spacing, radii, fonts, shadows } from '../../theme/uiTheme';

interface MutualFriendsProps {
  userId: string;
  userName: string;
  onUserPress: (userId: string) => void;
  onClose?: () => void;
  maxDisplay?: number;
  showConnectionPaths?: boolean;
}

export default function MutualFriends({
  userId,
  userName,
  onUserPress,
  onClose,
  maxDisplay = 50,
  showConnectionPaths = true,
}: MutualFriendsProps) {
  const { sendFriendRequest, getFriendshipStatus } = useFriends();

  const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'mutual_count'>('mutual_count');

  const loadMutualFriends = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // Get current user's friends
      const { data: currentUserFriends } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          user_requester:requester_id(id, display_name, username, avatar_url, friend_count),
          user_addressee:addressee_id(id, display_name, username, avatar_url, friend_count)
        `)
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      // Get target user's friends
      const { data: targetUserFriends } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          user_requester:requester_id(id, display_name, username, avatar_url, friend_count),
          user_addressee:addressee_id(id, display_name, username, avatar_url, friend_count)
        `)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (!currentUserFriends || !targetUserFriends) {
        setMutualFriends([]);
        return;
      }

      // Extract friend user objects
      const currentFriendIds = new Set<string>();
      const currentFriendsMap = new Map<string, User>();

      currentUserFriends.forEach(friendship => {
        const friend = friendship.requester_id === currentUser.id 
          ? friendship.user_addressee 
          : friendship.user_requester;
        if (friend) {
          currentFriendIds.add(friend.id);
          currentFriendsMap.set(friend.id, friend);
        }
      });

      const targetFriendIds = new Set<string>();
      targetUserFriends.forEach(friendship => {
        const friend = friendship.requester_id === userId 
          ? friendship.user_addressee 
          : friendship.user_requester;
        if (friend) {
          targetFriendIds.add(friend.id);
        }
      });

      // Find mutual friends
      const mutualFriendIds = [...currentFriendIds].filter(id => 
        targetFriendIds.has(id) && id !== userId && id !== currentUser.id
      );

      // Create mutual friends with additional mutual count data
      const mutualFriendsData: MutualFriend[] = [];
      
      for (const friendId of mutualFriendIds) {
        const user = currentFriendsMap.get(friendId);
        if (!user) continue;

        // Calculate mutual friends count for this user
        const { data: friendsFriends } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${friendId},addressee_id.eq.${friendId}`)
          .eq('status', 'accepted');

        const friendsOfFriend = new Set<string>();
        friendsFriends?.forEach(friendship => {
          const otherId = friendship.requester_id === friendId 
            ? friendship.addressee_id 
            : friendship.requester_id;
          friendsOfFriend.add(otherId);
        });

        const mutualCount = [...currentFriendIds].filter(id => 
          friendsOfFriend.has(id) && id !== friendId
        ).length;

        mutualFriendsData.push({
          user,
          mutual_count: mutualCount,
        });
      }

      setMutualFriends(mutualFriendsData.slice(0, maxDisplay));
    } catch (error) {
      console.error('Error loading mutual friends:', error);
      setMutualFriends([]);
    }
  }, [userId, maxDisplay]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMutualFriends();
    } catch (error) {
      console.error('Error refreshing mutual friends:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadMutualFriends]);

  const handleFriendAction = useCallback(async (targetUserId: string, action: FriendAction) => {
    if (action === 'add_friend') {
      try {
        setActionLoading(targetUserId);
        await sendFriendRequest(targetUserId);
      } catch (error) {
        console.error('Error sending friend request:', error);
      } finally {
        setActionLoading(null);
      }
    }
  }, [sendFriendRequest]);

  const sortedMutualFriends = useMemo(() => {
    const sorted = [...mutualFriends];
    
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.user.display_name.localeCompare(b.user.display_name));
      case 'mutual_count':
        return sorted.sort((a, b) => b.mutual_count - a.mutual_count);
      default:
        return sorted;
    }
  }, [mutualFriends, sortBy]);

  useEffect(() => {
    setLoading(true);
    loadMutualFriends().finally(() => setLoading(false));
  }, [loadMutualFriends]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Ionicons name="people" size={24} color={colors.primary} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Mutual Friends</Text>
          <Text style={styles.headerSubtitle}>
            You and {userName} have {mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons 
            name="list" 
            size={20} 
            color={viewMode === 'list' ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('grid')}
        >
          <Ionicons 
            name="grid" 
            size={20} 
            color={viewMode === 'grid' ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>

        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'mutual_count' && styles.sortButtonActive]}
        onPress={() => setSortBy('mutual_count')}
      >
        <Ionicons 
          name="trending-up" 
          size={16} 
          color={sortBy === 'mutual_count' ? colors.primary : colors.textSecondary} 
        />
        <Text style={[
          styles.sortButtonText, 
          sortBy === 'mutual_count' && styles.sortButtonTextActive
        ]}>
          Most Connected
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
        onPress={() => setSortBy('name')}
      >
        <Ionicons 
          name="text" 
          size={16} 
          color={sortBy === 'name' ? colors.primary : colors.textSecondary} 
        />
        <Text style={[
          styles.sortButtonText, 
          sortBy === 'name' && styles.sortButtonTextActive
        ]}>
          Name
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderConnectionVisualization = () => {
    if (!showConnectionPaths || mutualFriends.length === 0) return null;

    const topMutualFriends = sortedMutualFriends.slice(0, 6);

    return (
      <View style={styles.visualizationContainer}>
        <Text style={styles.visualizationTitle}>Connection Network</Text>
        <Text style={styles.visualizationSubtitle}>
          How you're connected through mutual friends
        </Text>
        
        <View style={styles.networkContainer}>
          {/* Current User */}
          <View style={styles.networkNode}>
            <View style={[styles.networkAvatar, styles.networkAvatarSelf]}>
              <Text style={styles.networkAvatarText}>You</Text>
            </View>
          </View>

          {/* Connection Lines */}
          <View style={styles.connectionLines}>
            {topMutualFriends.map((mutual, index) => (
              <View key={mutual.user.id} style={[
                styles.connectionLine,
                { top: 20 + (index * 40) }
              ]} />
            ))}
          </View>

          {/* Mutual Friends */}
          <View style={styles.mutualFriendsColumn}>
            {topMutualFriends.map((mutual) => (
              <TouchableOpacity
                key={mutual.user.id}
                style={styles.networkMutualFriend}
                onPress={() => onUserPress(mutual.user.id)}
              >
                {mutual.user.avatar_url ? (
                  <Image
                    source={{ uri: mutual.user.avatar_url }}
                    style={styles.networkMutualAvatar}
                    defaultSource={require('../../../assets/default-avatar.png')}
                  />
                ) : (
                  <View style={[styles.networkMutualAvatar, styles.networkAvatarPlaceholder]}>
                    <Text style={styles.networkAvatarInitial}>
                      {mutual.user.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.networkMutualName} numberOfLines={1}>
                  {mutual.user.display_name.split(' ')[0]}
                </Text>
                <Text style={styles.networkMutualCount}>
                  {mutual.mutual_count} mutual
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Target User */}
          <View style={styles.networkNode}>
            <TouchableOpacity
              style={styles.networkTargetUser}
              onPress={() => onUserPress(userId)}
            >
              <View style={[styles.networkAvatar, styles.networkAvatarTarget]}>
                <Text style={styles.networkAvatarText}>{userName.split(' ')[0]}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderMutualFriendItem = (mutual: MutualFriend, index: number) => {
    const friendshipStatus = getFriendshipStatus(mutual.user.id);

    if (viewMode === 'grid') {
      return (
        <View key={mutual.user.id} style={styles.gridItem}>
          <TouchableOpacity
            style={styles.gridUser}
            onPress={() => onUserPress(mutual.user.id)}
          >
            {mutual.user.avatar_url ? (
              <Image
                source={{ uri: mutual.user.avatar_url }}
                style={styles.gridAvatar}
                defaultSource={require('../../../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.gridAvatar, styles.gridAvatarPlaceholder]}>
                <Text style={styles.gridAvatarInitial}>
                  {mutual.user.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.gridName} numberOfLines={2}>
              {mutual.user.display_name}
            </Text>
            <Text style={styles.gridMutualCount}>
              {mutual.mutual_count} mutual
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View key={mutual.user.id} style={styles.mutualFriendItem}>
        <UserCard
          user={mutual.user}
          currentUserId="" // Filled by hook
          friendshipStatus={friendshipStatus}
          onPress={onUserPress}
          onFriendAction={handleFriendAction}
          size="medium"
          showActivity={false}
        />
        
        <View style={styles.mutualInfo}>
          <View style={styles.mutualStats}>
            <Ionicons name="people" size={16} color={colors.primary} />
            <Text style={styles.mutualStatsText}>
              {mutual.mutual_count} mutual friend{mutual.mutual_count !== 1 ? 's' : ''} with you
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMutualFriendsList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Finding mutual friends...</Text>
        </View>
      );
    }

    if (mutualFriends.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No mutual friends</Text>
          <Text style={styles.emptyStateMessage}>
            You and {userName} don't have any mutual friends yet. 
            As you both connect with more people, you might discover shared connections!
          </Text>
        </View>
      );
    }

    if (viewMode === 'grid') {
      return (
        <View style={styles.gridContainer}>
          {sortedMutualFriends.map((mutual, index) => renderMutualFriendItem(mutual, index))}
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {sortedMutualFriends.map((mutual, index) => renderMutualFriendItem(mutual, index))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderConnectionVisualization()}
      {renderSortOptions()}

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
        {renderMutualFriendsList()}
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
    flex: 1,
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

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  viewModeButton: {
    padding: spacing(0.5),
    borderRadius: radii.md,
  },

  viewModeButtonActive: {
    backgroundColor: colors.primaryLight,
  },

  closeButton: {
    padding: spacing(0.5),
  },

  visualizationContainer: {
    backgroundColor: colors.white,
    margin: spacing(2),
    padding: spacing(2),
    borderRadius: radii.lg,
    ...shadows.medium,
  },

  visualizationTitle: {
    fontSize: fonts.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },

  visualizationSubtitle: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing(2),
  },

  networkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 200,
    position: 'relative',
  },

  networkNode: {
    alignItems: 'center',
  },

  networkAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  networkAvatarSelf: {
    backgroundColor: colors.success,
  },

  networkAvatarTarget: {
    backgroundColor: colors.info,
  },

  networkAvatarText: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  connectionLines: {
    position: 'absolute',
    left: 80,
    right: 80,
    height: '100%',
  },

  connectionLine: {
    position: 'absolute',
    height: 1,
    left: 0,
    right: 0,
    backgroundColor: colors.outline,
  },

  mutualFriendsColumn: {
    alignItems: 'center',
    gap: spacing(1),
  },

  networkMutualFriend: {
    alignItems: 'center',
    width: 80,
  },

  networkMutualAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },

  networkAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  networkAvatarInitial: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  networkMutualName: {
    fontSize: fonts.xs,
    color: colors.text,
    marginTop: spacing(0.5),
    textAlign: 'center',
  },

  networkMutualCount: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  networkTargetUser: {
    alignItems: 'center',
  },

  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
    gap: spacing(1),
  },

  sortLabel: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
    gap: spacing(0.5),
  },

  sortButtonActive: {
    backgroundColor: colors.primaryLight,
  },

  sortButtonText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  sortButtonTextActive: {
    color: colors.primary,
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
  },

  // List view styles
  listContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing(2),
    marginTop: spacing(1),
    borderRadius: radii.lg,
    overflow: 'hidden',
  },

  mutualFriendItem: {
    padding: spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
  },

  mutualInfo: {
    marginTop: spacing(1.5),
    paddingTop: spacing(1.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },

  mutualStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },

  mutualStatsText: {
    fontSize: fonts.sm,
    color: colors.textSecondary,
    fontWeight: fonts.weights.medium,
  },

  // Grid view styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    gap: spacing(1),
  },

  gridItem: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },

  gridUser: {
    padding: spacing(2),
    alignItems: 'center',
  },

  gridAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing(1),
  },

  gridAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  gridAvatarInitial: {
    fontSize: fonts.lg,
    fontWeight: fonts.weights.bold,
    color: colors.white,
  },

  gridName: {
    fontSize: fonts.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(0.5),
  },

  gridMutualCount: {
    fontSize: fonts.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});