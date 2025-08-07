/**
 * Database query functions for Palate app
 * All functions use Supabase client with proper TypeScript typing
 */

import { supabase } from './supabase';
import type {
  User,
  Post,
  Cuisine,
  Friendship,
  UserCuisineProgress,
  PostLike,
  UserInsert,
  PostInsert,
  FriendshipInsert,
  UserCuisineProgressInsert,
  PostLikeInsert,
  UserUpdate,
  PostUpdate,
  FriendshipUpdate,
  UserCuisineProgressUpdate,
  PostWithDetails,
  UserWithStats,
  FriendshipWithUser,
  UserCuisineProgressWithDetails,
  DatabaseResponse,
  DatabaseArrayResponse,
  PostFilters,
  UserSearchFilters,
  UUID,
  FriendshipStatus,
} from './database.types';

// =============================================================================
// USER QUERIES
// =============================================================================

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: UUID): Promise<DatabaseResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get user profile with statistics
 */
export async function getUserWithStats(userId: UUID): Promise<DatabaseResponse<UserWithStats>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        posts:posts(count),
        user_cuisine_progress:user_cuisine_progress(count),
        friendships_requester:friendships!friendships_requester_id_fkey(count),
        friendships_addressee:friendships!friendships_addressee_id_fkey(count)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const userWithStats: UserWithStats = {
      ...data,
      cuisines_tried_count: data.user_cuisine_progress?.[0]?.count || 0,
      posts_count: data.posts?.[0]?.count || 0,
      friends_count: (data.friendships_requester?.[0]?.count || 0) + (data.friendships_addressee?.[0]?.count || 0),
    };

    return { data: userWithStats, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: UUID, updates: UserUpdate): Promise<DatabaseResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Search users by username or display name
 */
export async function searchUsers(filters: UserSearchFilters): Promise<DatabaseArrayResponse<User>> {
  try {
    let query = supabase.from('users').select('*');

    if (filters.username) {
      query = query.ilike('username', `%${filters.username}%`);
    }

    if (filters.display_name) {
      query = query.ilike('display_name', `%${filters.display_name}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<DatabaseResponse<boolean>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows returned, username is available
      return { data: true, error: null };
    }

    if (error) {
      return { data: null, error: error.message };
    }

    // Username exists
    return { data: false, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// =============================================================================
// POST QUERIES
// =============================================================================

/**
 * Create a new post
 */
export async function createPost(post: PostInsert): Promise<DatabaseResponse<Post>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get posts with user and cuisine details
 */
export async function getPostsWithDetails(filters: PostFilters = {}): Promise<DatabaseArrayResponse<PostWithDetails>> {
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, username, display_name, avatar_url),
        cuisine:cuisines!posts_cuisine_id_fkey(id, name, emoji),
        likes:post_likes(count)
      `)
      .order('created_at', { ascending: false });

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.cuisine_id) {
      query = query.eq('cuisine_id', filters.cuisine_id);
    }

    if (filters.dining_type) {
      query = query.eq('dining_type', filters.dining_type);
    }

    if (filters.is_private !== undefined) {
      query = query.eq('is_private', filters.is_private);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const postsWithDetails: PostWithDetails[] = data.map(post => ({
      ...post,
      likes_count: post.likes?.[0]?.count || 0,
      is_liked_by_user: false, // Will be set by separate query if needed
    }));

    return { data: postsWithDetails, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get user's feed (posts from friends)
 */
export async function getUserFeed(userId: UUID): Promise<DatabaseArrayResponse<PostWithDetails>> {
  try {
    // Get friend IDs first
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (friendError) {
      return { data: null, error: friendError.message };
    }

    const friendIds = friendships
      .map(f => f.requester_id === userId ? f.addressee_id : f.requester_id)
      .concat([userId]); // Include user's own posts

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, username, display_name, avatar_url),
        cuisine:cuisines!posts_cuisine_id_fkey(id, name, emoji),
        likes:post_likes(count)
      `)
      .in('user_id', friendIds)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { data: null, error: error.message };
    }

    const postsWithDetails: PostWithDetails[] = data.map(post => ({
      ...post,
      likes_count: post.likes?.[0]?.count || 0,
      is_liked_by_user: false,
    }));

    return { data: postsWithDetails, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get single post with details
 */
export async function getPostWithDetails(postId: UUID): Promise<DatabaseResponse<PostWithDetails>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, username, display_name, avatar_url),
        cuisine:cuisines!posts_cuisine_id_fkey(id, name, emoji),
        likes:post_likes(count)
      `)
      .eq('id', postId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const postWithDetails: PostWithDetails = {
      ...data,
      likes_count: data.likes?.[0]?.count || 0,
      is_liked_by_user: false,
    };

    return { data: postWithDetails, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Update post
 */
export async function updatePost(postId: UUID, updates: PostUpdate): Promise<DatabaseResponse<Post>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Delete post
 */
export async function deletePost(postId: UUID): Promise<DatabaseResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    return { data: !error, error: error?.message || null };
  } catch (error) {
    return { data: false, error: (error as Error).message };
  }
}

// =============================================================================
// CUISINE QUERIES
// =============================================================================

/**
 * Get all cuisines
 */
export async function getAllCuisines(): Promise<DatabaseArrayResponse<Cuisine>> {
  try {
    const { data, error } = await supabase
      .from('cuisines')
      .select('*')
      .order('name');

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get user's cuisine progress
 */
export async function getUserCuisineProgress(userId: UUID): Promise<DatabaseArrayResponse<UserCuisineProgressWithDetails>> {
  try {
    const { data, error } = await supabase
      .from('user_cuisine_progress')
      .select(`
        *,
        cuisine:cuisines!user_cuisine_progress_cuisine_id_fkey(id, name, emoji, category)
      `)
      .eq('user_id', userId)
      .order('first_tried_at', { ascending: false });

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Update or create user cuisine progress
 */
export async function upsertUserCuisineProgress(progress: UserCuisineProgressInsert): Promise<DatabaseResponse<UserCuisineProgress>> {
  try {
    const { data, error } = await supabase
      .from('user_cuisine_progress')
      .upsert(progress)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// =============================================================================
// FRIENDSHIP QUERIES
// =============================================================================

/**
 * Send friend request
 */
export async function sendFriendRequest(requesterId: UUID, addresseeId: UUID): Promise<DatabaseResponse<Friendship>> {
  try {
    const friendshipData: FriendshipInsert = {
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('friendships')
      .insert(friendshipData)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Update friendship status
 */
export async function updateFriendshipStatus(friendshipId: UUID, status: FriendshipStatus): Promise<DatabaseResponse<Friendship>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get user's friendships with user details
 */
export async function getUserFriendships(userId: UUID, status?: FriendshipStatus): Promise<DatabaseArrayResponse<FriendshipWithUser>> {
  try {
    let query = supabase
      .from('friendships')
      .select(`
        *,
        requester:users!friendships_requester_id_fkey(id, username, display_name, avatar_url),
        addressee:users!friendships_addressee_id_fkey(id, username, display_name, avatar_url)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Get pending friend requests for user
 */
export async function getPendingFriendRequests(userId: UUID): Promise<DatabaseArrayResponse<FriendshipWithUser>> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:users!friendships_requester_id_fkey(id, username, display_name, avatar_url),
        addressee:users!friendships_addressee_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return { data, error: error?.message || null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// =============================================================================
// LIKE QUERIES
// =============================================================================

/**
 * Toggle post like
 */
export async function togglePostLike(userId: UUID, postId: UUID): Promise<DatabaseResponse<{ liked: boolean }>> {
  try {
    // Check if like exists
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError.message };
    }

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        return { data: null, error: deleteError.message };
      }

      return { data: { liked: false }, error: null };
    } else {
      // Like
      const likeData: PostLikeInsert = {
        user_id: userId,
        post_id: postId
      };

      const { error: insertError } = await supabase
        .from('post_likes')
        .insert(likeData);

      if (insertError) {
        return { data: null, error: insertError.message };
      }

      return { data: { liked: true }, error: null };
    }
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Check if user has liked posts
 */
export async function getUserPostLikes(userId: UUID, postIds: UUID[]): Promise<DatabaseResponse<UUID[]>> {
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    if (error) {
      return { data: null, error: error.message };
    }

    const likedPostIds = data.map(like => like.post_id);
    return { data: likedPostIds, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}