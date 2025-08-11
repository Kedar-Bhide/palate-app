import { 
  User, 
  Friendship, 
  FriendshipStatus, 
  SearchQuery, 
  FriendSuggestion, 
  UserProfile,
  PrivacySettings 
} from '../types/friends';
import { supabase } from './supabase';

/**
 * Calculate the friendship status between current user and target user
 */
export function calculateFriendshipStatus(
  currentUserId: string,
  targetUserId: string,
  friendships: Friendship[]
): FriendshipStatus {
  if (currentUserId === targetUserId) {
    return 'none'; // Same user
  }

  const friendship = friendships.find(f => 
    (f.requester_id === currentUserId && f.addressee_id === targetUserId) ||
    (f.requester_id === targetUserId && f.addressee_id === currentUserId)
  );

  if (!friendship) {
    return 'none';
  }

  if (friendship.status === 'accepted') {
    return 'friends';
  }

  if (friendship.status === 'blocked') {
    if (friendship.requester_id === currentUserId) {
      return 'blocked_by_me';
    } else {
      return 'blocked_by_them';
    }
  }

  if (friendship.status === 'pending') {
    if (friendship.requester_id === currentUserId) {
      return 'pending_sent';
    } else {
      return 'pending_received';
    }
  }

  return 'none';
}

/**
 * Get mutual friends count between two users
 */
export async function getMutualFriendsCount(
  user1Id: string, 
  user2Id: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_mutual_friends_count', {
        user1_id: user1Id,
        user2_id: user2Id
      });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error getting mutual friends count:', error);
    return 0;
  }
}

/**
 * Get actual mutual friends between two users
 */
export async function getMutualFriends(
  user1Id: string, 
  user2Id: string,
  limit: number = 10
): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_mutual_friends', {
        user1_id: user1Id,
        user2_id: user2Id,
        friends_limit: limit
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting mutual friends:', error);
    return [];
  }
}

/**
 * Generate friend suggestions based on various algorithms
 */
export async function generateFriendSuggestions(
  currentUserId: string,
  limit: number = 20
): Promise<FriendSuggestion[]> {
  try {
    const suggestions: FriendSuggestion[] = [];

    // 1. Mutual friends suggestions
    const mutualFriendsSuggestions = await getMutualFriendsSuggestions(currentUserId, 8);
    suggestions.push(...mutualFriendsSuggestions);

    // 2. Cuisine similarity suggestions
    const cuisineSuggestions = await getCuisineSimilaritySuggestions(currentUserId, 6);
    suggestions.push(...cuisineSuggestions);

    // 3. Recent activity suggestions
    const activitySuggestions = await getRecentActivitySuggestions(currentUserId, 6);
    suggestions.push(...activitySuggestions);

    // Remove duplicates and sort by confidence score
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.user.id === suggestion.user.id)
      )
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, limit);

    return uniqueSuggestions;
  } catch (error) {
    console.error('Error generating friend suggestions:', error);
    return [];
  }
}

async function getMutualFriendsSuggestions(
  currentUserId: string, 
  limit: number
): Promise<FriendSuggestion[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_friends_of_friends', {
        user_id: currentUserId,
        suggestion_limit: limit
      });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      user: item.user,
      reason: 'mutual_friends' as const,
      mutual_friends_count: item.mutual_count,
      confidence_score: Math.min(0.9, 0.3 + (item.mutual_count * 0.1)),
      reason_text: `${item.mutual_count} mutual friend${item.mutual_count > 1 ? 's' : ''}`
    }));
  } catch (error) {
    console.error('Error getting mutual friends suggestions:', error);
    return [];
  }
}

async function getCuisineSimilaritySuggestions(
  currentUserId: string, 
  limit: number
): Promise<FriendSuggestion[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_cuisine_similarity_suggestions', {
        user_id: currentUserId,
        suggestion_limit: limit
      });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      user: item.user,
      reason: 'cuisine_similarity' as const,
      mutual_friends_count: 0,
      confidence_score: item.similarity_score,
      reason_text: `Similar taste in ${item.common_cuisines} cuisines`
    }));
  } catch (error) {
    console.error('Error getting cuisine similarity suggestions:', error);
    return [];
  }
}

async function getRecentActivitySuggestions(
  currentUserId: string, 
  limit: number
): Promise<FriendSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUserId)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((user: User) => ({
      user,
      reason: 'recent_activity' as const,
      mutual_friends_count: 0,
      confidence_score: 0.3,
      reason_text: 'New to Palate'
    }));
  } catch (error) {
    console.error('Error getting recent activity suggestions:', error);
    return [];
  }
}

/**
 * Filter users based on privacy settings
 */
export function filterUsersByPrivacy(
  users: User[], 
  currentUserId: string,
  friendships: Friendship[]
): User[] {
  return users.filter(user => {
    if (user.id === currentUserId) return false;
    
    const friendship = calculateFriendshipStatus(currentUserId, user.id, friendships);
    
    // Don't show blocked users
    if (friendship === 'blocked_by_them' || friendship === 'blocked_by_me') {
      return false;
    }

    // Show public users
    if (!user.is_private) return true;

    // Show friends
    if (friendship === 'friends') return true;

    // Hide private users who aren't friends
    return false;
  });
}

/**
 * Process search query to determine search type and clean value
 */
export function processSearchQuery(query: string): SearchQuery {
  const cleanQuery = query.trim();
  
  if (cleanQuery.startsWith('@')) {
    return {
      type: 'username',
      value: cleanQuery.substring(1),
      original: cleanQuery
    };
  }

  if (cleanQuery.includes('@') && cleanQuery.includes('.')) {
    return {
      type: 'email',
      value: cleanQuery.toLowerCase(),
      original: cleanQuery
    };
  }

  // Check if it looks like a username (alphanumeric + underscores)
  if (/^[a-zA-Z0-9_]+$/.test(cleanQuery)) {
    return {
      type: 'username',
      value: cleanQuery.toLowerCase(),
      original: cleanQuery
    };
  }

  return {
    type: 'name',
    value: cleanQuery,
    original: cleanQuery
  };
}

/**
 * Check if current user can view target user's profile
 */
export function canViewUserProfile(
  targetUser: User,
  currentUserId: string,
  friendshipStatus: FriendshipStatus
): boolean {
  // Can't view blocked users
  if (friendshipStatus === 'blocked_by_them' || friendshipStatus === 'blocked_by_me') {
    return false;
  }

  // Can view own profile
  if (targetUser.id === currentUserId) {
    return true;
  }

  // Can view public profiles
  if (!targetUser.is_private) {
    return true;
  }

  // Can view friend profiles
  if (friendshipStatus === 'friends') {
    return true;
  }

  // Can view limited info for pending requests
  if (friendshipStatus === 'pending_sent' || friendshipStatus === 'pending_received') {
    return true;
  }

  return false;
}

/**
 * Check if current user can view target user's posts
 */
export function canViewUserPosts(
  targetUser: User,
  currentUserId: string,
  friendshipStatus: FriendshipStatus,
  privacySettings?: PrivacySettings
): boolean {
  if (!canViewUserProfile(targetUser, currentUserId, friendshipStatus)) {
    return false;
  }

  if (targetUser.id === currentUserId) {
    return true;
  }

  const postVisibility = privacySettings?.post_visibility || (targetUser.is_private ? 'friends' : 'public');

  if (postVisibility === 'public') {
    return true;
  }

  if (postVisibility === 'friends' && friendshipStatus === 'friends') {
    return true;
  }

  return false;
}

/**
 * Check if current user can send friend request
 */
export function canSendFriendRequest(
  targetUser: User,
  friendshipStatus: FriendshipStatus,
  privacySettings?: PrivacySettings
): boolean {
  if (friendshipStatus !== 'none') {
    return false;
  }

  return privacySettings?.allow_friend_requests !== false;
}

/**
 * Format friendship status for display
 */
export function formatFriendshipStatus(status: FriendshipStatus): string {
  switch (status) {
    case 'none': return 'Add Friend';
    case 'pending_sent': return 'Request Sent';
    case 'pending_received': return 'Respond';
    case 'friends': return 'Friends';
    case 'blocked_by_me': return 'Blocked';
    case 'blocked_by_them': return 'Unavailable';
    default: return 'Unknown';
  }
}

/**
 * Get color for friendship status
 */
export function getFriendshipStatusColor(status: FriendshipStatus): string {
  switch (status) {
    case 'none': return '#007AFF';
    case 'pending_sent': return '#8E8E93';
    case 'pending_received': return '#FF9500';
    case 'friends': return '#34C759';
    case 'blocked_by_me': return '#FF3B30';
    case 'blocked_by_them': return '#8E8E93';
    default: return '#8E8E93';
  }
}

/**
 * Calculate relevance score for search results
 */
export function calculateRelevanceScore(
  user: User, 
  query: SearchQuery,
  mutualFriendsCount: number = 0
): number {
  let score = 0;
  const searchValue = query.value.toLowerCase();

  // Exact matches get highest score
  if (query.type === 'username' && user.username.toLowerCase() === searchValue) {
    score = 100;
  } else if (query.type === 'email' && user.email.toLowerCase() === searchValue) {
    score = 100;
  } else if (query.type === 'name' && user.display_name.toLowerCase() === searchValue) {
    score = 100;
  }
  // Prefix matches
  else if (user.username.toLowerCase().startsWith(searchValue)) {
    score = 80;
  } else if (user.display_name.toLowerCase().startsWith(searchValue)) {
    score = 75;
  }
  // Contains matches
  else if (user.username.toLowerCase().includes(searchValue)) {
    score = 60;
  } else if (user.display_name.toLowerCase().includes(searchValue)) {
    score = 55;
  } else if (user.email.toLowerCase().includes(searchValue)) {
    score = 50;
  }

  // Boost score based on mutual friends
  score += Math.min(mutualFriendsCount * 5, 20);

  // Boost for verified or popular users (if you have such fields)
  if (user.friend_count > 100) {
    score += 5;
  }

  return score;
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format mutual friends count for display
 */
export function formatMutualFriendsCount(count: number): string {
  if (count === 0) return '';
  if (count === 1) return '1 mutual friend';
  if (count < 1000) return `${count} mutual friends`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k mutual friends`;
  return `${(count / 1000000).toFixed(1)}m mutual friends`;
}

/**
 * Format user activity for display
 */
export function formatUserActivity(user: User): string {
  const now = new Date();
  const updatedAt = new Date(user.updated_at);
  const diffInHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    return 'Active now';
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `Active ${hours}h ago`;
  } else if (diffInHours < 168) { // 7 days
    const days = Math.floor(diffInHours / 24);
    return `Active ${days}d ago`;
  } else {
    return 'Active over a week ago';
  }
}