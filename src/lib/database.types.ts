/**
 * Database types for Palate app Supabase schema
 * Auto-generated TypeScript interfaces matching the database structure
 */

// Base Supabase types
export type UUID = string;
export type Timestamp = string;
export type Point = {
  x: number;
  y: number;
};

// Enum types
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type DiningType = 'fine_dining' | 'casual' | 'fast_food' | 'street_food' | 'home_cooking';
export type CuisineCategory = 'European' | 'Asian' | 'African' | 'Latin American' | 'American' | 'Middle Eastern';

// Database row types
export interface User {
  id: UUID;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  push_token: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Cuisine {
  id: number;
  name: string;
  category: CuisineCategory;
  emoji: string | null;
  created_at: Timestamp;
}

export interface Post {
  id: UUID;
  user_id: UUID;
  restaurant_name: string;
  cuisine_id: number | null;
  rating: number | null; // 1-5
  review_text: string | null;
  location_name: string | null;
  location_coords: Point | null;
  dining_type: DiningType | null;
  image_urls: string[];
  is_private: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Friendship {
  id: UUID;
  requester_id: UUID;
  addressee_id: UUID;
  status: FriendshipStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserCuisineProgress {
  id: UUID;
  user_id: UUID;
  cuisine_id: number;
  first_tried_at: Timestamp;
  times_tried: number;
  favorite_restaurant: string | null;
}

export interface PostLike {
  id: UUID;
  user_id: UUID;
  post_id: UUID;
  created_at: Timestamp;
}

// Insert types (for creating new records)
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id: UUID; // Required for Supabase auth integration
};

export type CuisineInsert = Omit<Cuisine, 'id' | 'created_at'>;

export type PostInsert = Omit<Post, 'id' | 'created_at' | 'updated_at'>;

export type FriendshipInsert = Omit<Friendship, 'id' | 'created_at' | 'updated_at'>;

export type UserCuisineProgressInsert = Omit<UserCuisineProgress, 'id'>;

export type PostLikeInsert = Omit<PostLike, 'id' | 'created_at'>;

// Update types (for updating existing records)
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;

export type PostUpdate = Partial<Omit<Post, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type FriendshipUpdate = Partial<Pick<Friendship, 'status'>>;

export type UserCuisineProgressUpdate = Partial<Omit<UserCuisineProgress, 'id' | 'user_id' | 'cuisine_id'>>;

// Extended types with relationships
export type PostWithDetails = Post & {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  cuisine: Pick<Cuisine, 'id' | 'name' | 'emoji'> | null;
  likes_count: number;
  is_liked_by_user: boolean;
};

export type UserWithStats = User & {
  cuisines_tried_count: number;
  posts_count: number;
  friends_count: number;
};

export type FriendshipWithUser = Friendship & {
  requester: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  addressee: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

export type UserCuisineProgressWithDetails = UserCuisineProgress & {
  cuisine: Pick<Cuisine, 'id' | 'name' | 'emoji' | 'category'>;
};

// Response types for API functions
export interface DatabaseResponse<T> {
  data: T | null;
  error: string | null;
}

export interface DatabaseArrayResponse<T> {
  data: T[] | null;
  error: string | null;
}

// Search and filter types
export interface PostFilters {
  user_id?: UUID;
  cuisine_id?: number;
  dining_type?: DiningType;
  is_private?: boolean;
  friends_only?: boolean;
}

export interface UserSearchFilters {
  username?: string;
  display_name?: string;
  limit?: number;
  offset?: number;
}

// Utility types
export type Tables = {
  users: User;
  cuisines: Cuisine;
  posts: Post;
  friendships: Friendship;
  user_cuisine_progress: UserCuisineProgress;
  post_likes: PostLike;
};

export type TableInserts = {
  users: UserInsert;
  cuisines: CuisineInsert;
  posts: PostInsert;
  friendships: FriendshipInsert;
  user_cuisine_progress: UserCuisineProgressInsert;
  post_likes: PostLikeInsert;
};

export type TableUpdates = {
  users: UserUpdate;
  posts: PostUpdate;
  friendships: FriendshipUpdate;
  user_cuisine_progress: UserCuisineProgressUpdate;
};