export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  is_private: boolean;
  friend_count: number;
  post_count: number;
  cuisine_count: number;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  requester?: User;
  addressee?: User;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending';
  created_at: string;
  requester: User;
  addressee: User;
}

export type FriendshipStatus = 
  | 'none' 
  | 'pending_sent' 
  | 'pending_received' 
  | 'friends' 
  | 'blocked_by_them' 
  | 'blocked_by_me';

export type FriendAction = 
  | 'add_friend'
  | 'accept_request'
  | 'decline_request'
  | 'cancel_request'
  | 'remove_friend'
  | 'block_user'
  | 'unblock_user';

export interface MutualFriend {
  user: User;
  mutual_count: number;
}

export interface SearchResult {
  user: User;
  friendship_status: FriendshipStatus;
  mutual_friends_count: number;
  relevance_score: number;
}

export interface SearchQuery {
  type: 'username' | 'email' | 'name' | 'mixed';
  value: string;
  original: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  type: 'post' | 'cuisine_try' | 'friend_add';
  created_at: string;
  data: any;
  user?: User;
}

export interface FriendSuggestion {
  user: User;
  reason: 'mutual_friends' | 'cuisine_similarity' | 'location' | 'recent_activity';
  mutual_friends_count: number;
  confidence_score: number;
  reason_text: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user: User;
}

export interface FriendListItem {
  user: User;
  friendship: Friendship;
  last_activity?: string;
  mutual_friends_count: number;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  search_type: 'username' | 'email' | 'name';
  created_at: string;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  post_visibility: 'public' | 'friends' | 'private';
  friend_list_visibility: 'public' | 'friends' | 'private';
  search_visibility: boolean;
  allow_friend_requests: boolean;
}

export interface UserProfile {
  user: User;
  friendship_status: FriendshipStatus;
  mutual_friends_count: number;
  mutual_friends: User[];
  can_view_posts: boolean;
  can_view_friends: boolean;
  can_send_message: boolean;
  recent_posts?: any[];
  privacy_settings: PrivacySettings;
}

export interface FriendStats {
  total_friends: number;
  mutual_friends: number;
  pending_requests: number;
  sent_requests: number;
  blocked_users: number;
}


export interface FriendActivity {
  id: string;
  user_id: string;
  type: 'post_created' | 'cuisine_tried' | 'achievement_unlocked' | 'friend_joined' | 'milestone_reached';
  title: string;
  description: string;
  created_at: string;
  metadata?: {
    post_id?: string;
    cuisine_name?: string;
    achievement_name?: string;
    milestone_type?: string;
    photo_url?: string;
  };
  user: User;
}

export interface FriendStats {
  total_friends: number;
  mutual_friends: number;
  friend_since: string;
  interactions_count: number;
  shared_restaurants: number;
  common_cuisines: number;
  last_interaction: string;
}

export interface FriendshipEvent {
  id: string;
  friend_id: string;
  event_type: 'became_friends' | 'interaction' | 'shared_post' | 'restaurant_visit';
  event_date: string;
  event_data?: any;
}

export interface CloseFriend {
  user_id: string;
  friend_id: string;
  marked_at: string;
}

export interface FriendCategory {
  id: string;
  name: string;
  friends: User[];
  count: number;
  icon: string;
}

export interface ActivityEngagement {
  activity_id: string;
  user_id: string;
  type: 'like' | 'comment' | 'view';
  created_at: string;
}