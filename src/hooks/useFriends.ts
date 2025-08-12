import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import {
  User,
  Friendship,
  FriendRequest,
  FriendshipStatus,
  SearchResult,
  FriendSuggestion,
  BlockedUser,
  SearchHistory,
  FriendActivity,
  FriendStats,
  FriendListItem,
  MutualFriend
} from '../types/friends';
import {
  calculateFriendshipStatus,
  getMutualFriendsCount,
  generateFriendSuggestions,
  filterUsersByPrivacy,
  processSearchQuery,
  calculateRelevanceScore,
  debounce
} from '../lib/friendsUtils';

export function useFriends() {
  const [friends, setFriends] = useState<User[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<FriendSuggestion[]>([]);
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Load initial friend data
  const loadFriendData = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      await Promise.all([
        loadFriends(user.id),
        loadFriendRequests(user.id),
        loadSentRequests(user.id),
        loadBlockedUsers(user.id),
        loadSearchHistory(user.id),
        loadFriendStats(user.id),
      ]);

      // Load activities after friends are loaded
      await loadFriendActivities(user.id);

    } catch (err) {
      console.error('Error loading friend data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friend data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFriends = useCallback(async (userId: string) => {
    try {
      const { data: friendshipsData, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:users!requester_id(*),
          addressee:users!addressee_id(*)
        `)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;

      const friendsList: User[] = [];
      const friendshipsList: Friendship[] = [];

      (friendshipsData || []).forEach(friendship => {
        friendshipsList.push(friendship);
        
        const friend = friendship.requester_id === userId 
          ? friendship.addressee 
          : friendship.requester;
          
        if (friend) {
          friendsList.push(friend);
        }
      });

      setFriends(friendsList);
      setFriendships(friendshipsList);
    } catch (err) {
      console.error('Error loading friends:', err);
      throw err;
    }
  }, []);

  const loadFriendRequests = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:users!requester_id(*)
        `)
        .eq('addressee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requests = (data || []).map(item => ({
        id: item.id,
        requester_id: item.requester_id,
        addressee_id: item.addressee_id,
        status: 'pending' as const,
        created_at: item.created_at,
        requester: item.requester,
        addressee: item.addressee
      }));

      setFriendRequests(requests);
    } catch (err) {
      console.error('Error loading friend requests:', err);
      throw err;
    }
  }, []);

  const loadSentRequests = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          addressee:users!addressee_id(*)
        `)
        .eq('requester_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requests = (data || []).map(item => ({
        id: item.id,
        requester_id: item.requester_id,
        addressee_id: item.addressee_id,
        status: 'pending' as const,
        created_at: item.created_at,
        requester: item.requester,
        addressee: item.addressee
      }));

      setSentRequests(requests);
    } catch (err) {
      console.error('Error loading sent requests:', err);
      throw err;
    }
  }, []);

  const loadBlockedUsers = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          blocked_user:users!addressee_id(*)
        `)
        .eq('requester_id', userId)
        .eq('status', 'blocked')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const blocked = (data || []).map(item => ({
        id: item.id,
        blocker_id: item.requester_id,
        blocked_id: item.addressee_id,
        created_at: item.created_at,
        blocked_user: item.blocked_user
      }));

      setBlockedUsers(blocked);
    } catch (err) {
      console.error('Error loading blocked users:', err);
      throw err;
    }
  }, []);

  const loadSearchHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSearchHistory(data || []);
    } catch (err) {
      console.error('Error loading search history:', err);
    }
  }, []);

  const loadFriendActivities = useCallback(async (userId: string) => {
    try {
      setActivitiesLoading(true);
      const friendIds = friends.map(friend => friend.id);
      if (friendIds.length === 0) {
        setFriendActivities([]);
        return;
      }

      const { data, error } = await supabase
        .from('friend_activities')
        .select(`
          *,
          user:user_id(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFriendActivities(data || []);
    } catch (err) {
      console.error('Error loading friend activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [friends]);

  const loadFriendStats = useCallback(async (userId: string) => {
    try {
      // Calculate friend stats
      const totalFriends = friends.length;
      const pendingRequests = friendRequests.length;
      const sentRequestsCount = sentRequests.length;
      const blockedCount = blockedUsers.length;
      
      // Get mutual friends count (simplified)
      const mutualFriends = Math.floor(totalFriends * 0.3); // Placeholder calculation

      const stats: FriendStats = {
        total_friends: totalFriends,
        mutual_friends: mutualFriends,
        pending_requests: pendingRequests,
        sent_requests: sentRequestsCount,
        blocked_users: blockedCount,
      };

      setFriendStats(stats);
    } catch (err) {
      console.error('Error loading friend stats:', err);
    }
  }, [friends.length, friendRequests.length, sentRequests.length, blockedUsers.length]);


  const searchUsers = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    try {
      setSearchLoading(true);
      const user = await getCurrentUser();
      if (!user) return [];

      const processedQuery = processSearchQuery(query);
      let searchQuery = supabase
        .from('users')
        .select('*')
        .neq('id', user.id);

      // Build search query based on type
      if (processedQuery.type === 'username') {
        searchQuery = searchQuery.ilike('username', `%${processedQuery.value}%`);
      } else if (processedQuery.type === 'email') {
        searchQuery = searchQuery.ilike('email', `%${processedQuery.value}%`);
      } else if (processedQuery.type === 'name') {
        searchQuery = searchQuery.or(
          `display_name.ilike.%${processedQuery.value}%,username.ilike.%${processedQuery.value}%`
        );
      }

      const { data: users, error } = await searchQuery
        .limit(20);

      if (error) throw error;

      if (!users || users.length === 0) {
        setSearchResults([]);
        return [];
      }

      // Filter by privacy
      const filteredUsers = filterUsersByPrivacy(users, user.id, friendships);

      // Calculate search results with additional data
      const results: SearchResult[] = [];
      
      for (const searchUser of filteredUsers) {
        const friendshipStatus = calculateFriendshipStatus(user.id, searchUser.id, friendships);
        const mutualFriendsCount = await getMutualFriendsCount(user.id, searchUser.id);
        const relevanceScore = calculateRelevanceScore(searchUser, processedQuery, mutualFriendsCount);

        results.push({
          user: searchUser,
          friendship_status: friendshipStatus,
          mutual_friends_count: mutualFriendsCount,
          relevance_score: relevanceScore
        });
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevance_score - a.relevance_score);

      setSearchResults(results);
      
      // Save search to history
      await saveSearchToHistory(user.id, query, processedQuery.type);

      return results;
    } catch (err) {
      console.error('Error searching users:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [friendships]);

  const saveSearchToHistory = useCallback(async (
    userId: string, 
    query: string, 
    searchType: 'username' | 'email' | 'name'
  ) => {
    try {
      const { error } = await supabase
        .from('search_history')
        .upsert({
          user_id: userId,
          query: query.trim(),
          search_type: searchType
        });

      if (error) throw error;
      
      // Refresh search history
      await loadSearchHistory(userId);
    } catch (err) {
      console.error('Error saving search history:', err);
    }
  }, [loadSearchHistory]);

  const clearSearchHistory = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setSearchHistory([]);
    } catch (err) {
      console.error('Error clearing search history:', err);
    }
  }, []);

  const loadSuggestedUsers = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const suggestions = await generateFriendSuggestions(user.id, 15);
      setSuggestedUsers(suggestions);
    } catch (err) {
      console.error('Error loading suggested users:', err);
    }
  }, []);

  const sendFriendRequest = useCallback(async (userId: string): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: 'pending'
        });

      if (error) throw error;


      // Update local state
      await loadSentRequests(user.id);
      
      // Update search results if the user is in search results
      setSearchResults(prev => prev.map(result => 
        result.user.id === userId 
          ? { ...result, friendship_status: 'pending_sent' as FriendshipStatus }
          : result
      ));

    } catch (err) {
      console.error('Error sending friend request:', err);
      throw err;
    }
  }, [loadSentRequests]);

  const acceptFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Get the friend request details first
      const friendRequest = friendRequests.find(req => req.id === requestId);
      if (!friendRequest) throw new Error('Friend request not found');

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;


      // Refresh friend data
      await Promise.all([
        loadFriends(user.id),
        loadFriendRequests(user.id)
      ]);

    } catch (err) {
      console.error('Error accepting friend request:', err);
      throw err;
    }
  }, [loadFriends, loadFriendRequests, friendRequests]);

  const declineFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      // Remove from local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));

    } catch (err) {
      console.error('Error declining friend request:', err);
      throw err;
    }
  }, []);

  const cancelFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      // Remove from local state
      setSentRequests(prev => prev.filter(req => req.id !== requestId));

    } catch (err) {
      console.error('Error canceling friend request:', err);
      throw err;
    }
  }, []);

  const removeFriend = useCallback(async (userId: string): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);

      if (error) throw error;

      // Remove from local state
      setFriends(prev => prev.filter(friend => friend.id !== userId));
      setFriendships(prev => prev.filter(friendship => 
        !((friendship.requester_id === user.id && friendship.addressee_id === userId) ||
          (friendship.requester_id === userId && friendship.addressee_id === user.id))
      ));

    } catch (err) {
      console.error('Error removing friend:', err);
      throw err;
    }
  }, []);

  const blockUser = useCallback(async (userId: string): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // First remove any existing friendship
      await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);

      // Create block relationship
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: 'blocked'
        });

      if (error) throw error;

      // Refresh data
      await Promise.all([
        loadFriends(user.id),
        loadBlockedUsers(user.id),
        loadFriendRequests(user.id),
        loadSentRequests(user.id)
      ]);

    } catch (err) {
      console.error('Error blocking user:', err);
      throw err;
    }
  }, [loadFriends, loadBlockedUsers, loadFriendRequests, loadSentRequests]);

  const unblockUser = useCallback(async (userId: string): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('requester_id', user.id)
        .eq('addressee_id', userId)
        .eq('status', 'blocked');

      if (error) throw error;

      // Remove from local state
      setBlockedUsers(prev => prev.filter(blocked => blocked.blocked_id !== userId));

    } catch (err) {
      console.error('Error unblocking user:', err);
      throw err;
    }
  }, []);

  const getFriendshipStatus = useCallback((userId: string): FriendshipStatus => {
    const user = getCurrentUser();
    if (!user) return 'none';
    
    return calculateFriendshipStatus(user.id, userId, friendships);
  }, [friendships]);

  // Advanced friend management functions
  const bulkRemoveFriends = useCallback(async (userIds: string[]): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Remove friendships in batch
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(userIds.map(id => 
          `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
        ).join(','));

      if (error) throw error;

      // Update local state
      setFriends(prev => prev.filter(friend => !userIds.includes(friend.id)));
      setFriendships(prev => prev.filter(friendship => 
        !((friendship.requester_id === user.id && userIds.includes(friendship.addressee_id)) ||
          (friendship.addressee_id === user.id && userIds.includes(friendship.requester_id)))
      ));
    } catch (err) {
      console.error('Error bulk removing friends:', err);
      throw err;
    }
  }, []);

  const bulkBlockUsers = useCallback(async (userIds: string[]): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // First remove any existing friendships
      await supabase
        .from('friendships')
        .delete()
        .or(userIds.map(id => 
          `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
        ).join(','));

      // Create block relationships
      const blockData = userIds.map(blockedId => ({
        requester_id: user.id,
        addressee_id: blockedId,
        status: 'blocked'
      }));

      const { error } = await supabase
        .from('friendships')
        .insert(blockData);

      if (error) throw error;

      // Refresh data
      await Promise.all([
        loadFriends(user.id),
        loadBlockedUsers(user.id),
        loadFriendRequests(user.id),
        loadSentRequests(user.id)
      ]);
    } catch (err) {
      console.error('Error bulk blocking users:', err);
      throw err;
    }
  }, [loadFriends, loadBlockedUsers, loadFriendRequests, loadSentRequests]);

  const getMutualFriends = useCallback(async (userId: string): Promise<MutualFriend[]> => {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user:addressee_id(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('requester_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;

      // Filter to only show mutual friends
      const mutualFriends = data?.filter(friendship => 
        friendships.some(f => 
          f.status === 'accepted' && 
          ((f.requester_id === user.id && f.addressee_id === friendship.user.id) ||
           (f.addressee_id === user.id && f.requester_id === friendship.user.id))
        )
      ) || [];

      return mutualFriends.map(f => f.user);
    } catch (err) {
      console.error('Error getting mutual friends:', err);
      return [];
    }
  }, [friendships]);

  const getFriendSuggestionsByActivity = useCallback(async (limit: number = 10): Promise<FriendSuggestion[]> => {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      // Get users with similar activity patterns
      const { data, error } = await supabase
        .from('user_activities')
        .select(`
          user_id,
          activity_type,
          user:user_id(
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter

      if (error) throw error;

      // Filter out existing friends and blocked users
      const existingIds = new Set([
        ...friends.map(f => f.id),
        ...blockedUsers.map(b => b.blocked_id)
      ]);

      const suggestions = data
        ?.filter(activity => !existingIds.has(activity.user_id))
        .slice(0, limit)
        .map(activity => ({
          user: activity.user,
          reason: 'Similar activity patterns',
          mutual_friends_count: 0, // Placeholder
          relevance_score: Math.random() * 0.5 + 0.5 // Placeholder score
        })) || [];

      return suggestions;
    } catch (err) {
      console.error('Error getting friend suggestions by activity:', err);
      return [];
    }
  }, [friends, blockedUsers]);

  // Create debounced search function
  const debouncedSearch = useMemo(
    () => debounce(searchUsers, 300),
    [searchUsers]
  );

  // Initialize data on mount
  useEffect(() => {
    loadFriendData();
  }, [loadFriendData]);

  // Load suggested users after friends are loaded
  useEffect(() => {
    if (!loading && friends.length >= 0) {
      loadSuggestedUsers();
    }
  }, [loading, friends.length, loadSuggestedUsers]);

  return {
    // Data
    friends,
    friendRequests,
    sentRequests,
    blockedUsers,
    searchResults,
    searchHistory,
    suggestedUsers,
    friendActivities,
    friendStats,
    
    // State
    loading,
    searchLoading,
    activitiesLoading,
    error,
    
    // Actions
    searchUsers: debouncedSearch,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    getFriendshipStatus,
    clearSearchHistory,
    refreshData: loadFriendData,
    refreshSuggestions: loadSuggestedUsers,
    
    // Advanced Features
    refreshActivities: () => loadFriendActivities(getCurrentUser()?.id || ''),
    refreshStats: () => loadFriendStats(getCurrentUser()?.id || ''),
    
    // Bulk Operations
    bulkRemoveFriends,
    bulkBlockUsers,
    
    // Advanced Friend Management
    getMutualFriends,
    getFriendSuggestionsByActivity,
    
    // Utils
    setSearchResults,
  };
}