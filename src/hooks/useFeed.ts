/**
 * useFeed Hook
 * Feed data management with real-time updates and optimizations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

import { supabase, getCurrentUser } from '../lib/supabase';
import { Post } from '../types';
import {
  sortPostsByAlgorithm,
  filterPostsByUserPreferences,
  paginateFeed,
  shouldShowPost,
  cacheFeedData,
  getCachedFeedData,
  clearFeedCache,
  diversifyFeed,
  FeedAlgorithm,
  PaginatedFeed,
} from '../lib/feedUtils';

// Hook state interface
export interface FeedState {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  algorithm: FeedAlgorithm;
  lastRefreshTime: Date | null;
}

// Hook configuration
interface FeedConfig {
  pageSize: number;
  enableRealtime: boolean;
  enableCache: boolean;
  algorithm: FeedAlgorithm;
}

// Post interaction state
interface PostInteraction {
  [postId: string]: {
    isLiked: boolean;
    likeCount: number;
    commentCount: number;
  };
}

const DEFAULT_CONFIG: FeedConfig = {
  pageSize: 10,
  enableRealtime: true,
  enableCache: true,
  algorithm: 'recent',
};

export const useFeed = (config: Partial<FeedConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Core state
  const [state, setState] = useState<FeedState>({
    posts: [],
    loading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    error: null,
    algorithm: finalConfig.algorithm,
    lastRefreshTime: null,
  });

  // Post interactions state (likes, comments)
  const [interactions, setInteractions] = useState<PostInteraction>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  
  // Refs for managing subscriptions and optimization
  const realtimeSubscription = useRef<any>(null);
  const lastLoadTime = useRef<Date | null>(null);
  const isInitialized = useRef(false);

  /**
   * Load feed posts from database
   */
  const loadFeed = useCallback(async (refresh: boolean = false): Promise<void> => {
    if (state.loading || state.refreshing) return;

    try {
      setState(prev => ({ 
        ...prev, 
        loading: !refresh, 
        refreshing: refresh,
        error: null,
      }));

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Try cache first if not refreshing
      if (!refresh && finalConfig.enableCache) {
        const cachedPosts = await getCachedFeedData(currentUser.id);
        if (cachedPosts && cachedPosts.length > 0) {
          const filteredPosts = await filterPostsByUserPreferences(cachedPosts, currentUser.id);
          const sortedPosts = sortPostsByAlgorithm(filteredPosts, state.algorithm);
          
          setState(prev => ({
            ...prev,
            posts: sortedPosts,
            loading: false,
            refreshing: false,
            hasMore: sortedPosts.length >= finalConfig.pageSize,
            lastRefreshTime: new Date(),
          }));
          
          // Load interactions for cached posts
          await loadPostInteractions(sortedPosts);
          return;
        }
      }

      // Fetch posts from database with populated relations
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false })
        .limit(finalConfig.pageSize * 3) // Fetch more for filtering
        .not('is_private', 'eq', true); // Only public posts for now

      if (postsError) {
        throw new Error(`Failed to load posts: ${postsError.message}`);
      }

      if (!posts) {
        throw new Error('No posts data received');
      }

      // Filter posts based on user preferences and visibility rules
      let filteredPosts: Post[] = [];
      for (const post of posts) {
        const show = await shouldShowPost(post, currentUser);
        if (show) {
          filteredPosts.push(post);
        }
      }

      // Apply user preference filters
      filteredPosts = await filterPostsByUserPreferences(filteredPosts, currentUser.id);
      
      // Sort by selected algorithm
      const sortedPosts = sortPostsByAlgorithm(filteredPosts, state.algorithm);
      
      // Diversify feed for better user experience
      const diversifiedPosts = diversifyFeed(sortedPosts);
      
      // Limit to page size for initial load
      const limitedPosts = diversifiedPosts.slice(0, finalConfig.pageSize);

      // Cache the posts if enabled
      if (finalConfig.enableCache) {
        await cacheFeedData(diversifiedPosts, currentUser.id);
      }

      // Update state
      setState(prev => ({
        ...prev,
        posts: limitedPosts,
        loading: false,
        refreshing: false,
        hasMore: diversifiedPosts.length > finalConfig.pageSize,
        lastRefreshTime: new Date(),
      }));

      // Load post interactions
      await loadPostInteractions(limitedPosts);
      
      // Reset pagination
      setCurrentPage(0);
      setTotalPosts(diversifiedPosts.length);
      lastLoadTime.current = new Date();

    } catch (error) {
      console.error('Error loading feed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load feed';
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: errorMessage,
      }));
      
      Alert.alert('Error', errorMessage);
    }
  }, [state.loading, state.refreshing, state.algorithm, finalConfig.pageSize, finalConfig.enableCache]);

  /**
   * Load more posts for pagination
   */
  const loadMorePosts = useCallback(async (): Promise<void> => {
    if (state.loadingMore || !state.hasMore || state.loading) return;

    try {
      setState(prev => ({ ...prev, loadingMore: true, error: null }));

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const nextPage = currentPage + 1;
      const offset = nextPage * finalConfig.pageSize;

      // Fetch more posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + finalConfig.pageSize - 1)
        .not('is_private', 'eq', true);

      if (postsError) {
        throw new Error(`Failed to load more posts: ${postsError.message}`);
      }

      if (!posts || posts.length === 0) {
        setState(prev => ({ ...prev, loadingMore: false, hasMore: false }));
        return;
      }

      // Filter and process posts
      let filteredPosts: Post[] = [];
      for (const post of posts) {
        const show = await shouldShowPost(post, currentUser);
        if (show) {
          filteredPosts.push(post);
        }
      }

      filteredPosts = await filterPostsByUserPreferences(filteredPosts, currentUser.id);
      const sortedPosts = sortPostsByAlgorithm(filteredPosts, state.algorithm);

      // Update state with new posts
      setState(prev => ({
        ...prev,
        posts: [...prev.posts, ...sortedPosts],
        loadingMore: false,
        hasMore: sortedPosts.length === finalConfig.pageSize,
      }));

      // Load interactions for new posts
      await loadPostInteractions(sortedPosts);
      
      setCurrentPage(nextPage);

    } catch (error) {
      console.error('Error loading more posts:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more posts';
      setState(prev => ({
        ...prev,
        loadingMore: false,
        error: errorMessage,
      }));
    }
  }, [state.loadingMore, state.hasMore, state.loading, currentPage, finalConfig.pageSize, state.algorithm]);

  /**
   * Refresh feed
   */
  const refreshFeed = useCallback(async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Clear cache before refresh
    const currentUser = await getCurrentUser();
    if (currentUser && finalConfig.enableCache) {
      await clearFeedCache(currentUser.id);
    }
    
    setCurrentPage(0);
    await loadFeed(true);
  }, [loadFeed, finalConfig.enableCache]);

  /**
   * Like a post with optimistic updates
   */
  const likePost = useCallback(async (postId: string): Promise<void> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Optimistic update
      setInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          isLiked: true,
          likeCount: (prev[postId]?.likeCount || 0) + 1,
        },
      }));

      // Database update
      const { error } = await supabase
        .from('post_likes')
        .upsert({
          user_id: currentUser.id,
          post_id: postId,
        });

      if (error) {
        throw error;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    } catch (error) {
      console.error('Error liking post:', error);
      
      // Revert optimistic update
      setInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          isLiked: false,
          likeCount: Math.max((prev[postId]?.likeCount || 1) - 1, 0),
        },
      }));
      
      Alert.alert('Error', 'Failed to like post. Please try again.');
    }
  }, []);

  /**
   * Unlike a post with optimistic updates
   */
  const unlikePost = useCallback(async (postId: string): Promise<void> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Optimistic update
      setInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          isLiked: false,
          likeCount: Math.max((prev[postId]?.likeCount || 1) - 1, 0),
        },
      }));

      // Database update
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('post_id', postId);

      if (error) {
        throw error;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    } catch (error) {
      console.error('Error unliking post:', error);
      
      // Revert optimistic update
      setInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          isLiked: true,
          likeCount: (prev[postId]?.likeCount || 0) + 1,
        },
      }));
      
      Alert.alert('Error', 'Failed to unlike post. Please try again.');
    }
  }, []);

  /**
   * Toggle like status
   */
  const toggleLike = useCallback(async (postId: string): Promise<void> => {
    const currentInteraction = interactions[postId];
    const isLiked = currentInteraction?.isLiked || false;
    
    if (isLiked) {
      await unlikePost(postId);
    } else {
      await likePost(postId);
    }
  }, [interactions, likePost, unlikePost]);

  /**
   * Update post in feed
   */
  const updatePostInFeed = useCallback((postId: string, updates: Partial<Post>): void => {
    setState(prev => ({
      ...prev,
      posts: prev.posts.map(post =>
        post.id === postId ? { ...post, ...updates } : post
      ),
    }));
  }, []);

  /**
   * Load post interactions (likes, comments)
   */
  const loadPostInteractions = useCallback(async (posts: Post[]): Promise<void> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || posts.length === 0) return;

      const postIds = posts.map(post => post.id);

      // Load likes
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      if (likesError) {
        console.warn('Error loading likes:', likesError);
        return;
      }

      // Process interactions
      const newInteractions: PostInteraction = {};
      
      posts.forEach(post => {
        const postLikes = likes?.filter(like => like.post_id === post.id) || [];
        const isLiked = postLikes.some(like => like.user_id === currentUser.id);
        
        newInteractions[post.id] = {
          isLiked,
          likeCount: postLikes.length,
          commentCount: 0, // Would load from comments table
        };
      });

      setInteractions(prev => ({ ...prev, ...newInteractions }));

    } catch (error) {
      console.error('Error loading post interactions:', error);
    }
  }, []);

  /**
   * Change feed algorithm
   */
  const changeAlgorithm = useCallback((algorithm: FeedAlgorithm): void => {
    setState(prev => ({ ...prev, algorithm }));
    // Re-sort current posts
    setState(prev => ({
      ...prev,
      posts: sortPostsByAlgorithm(prev.posts, algorithm),
    }));
  }, []);

  /**
   * Setup realtime subscriptions
   */
  const setupRealtimeSubscription = useCallback((): void => {
    if (!finalConfig.enableRealtime) return;

    realtimeSubscription.current = supabase
      .channel('feed_updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'posts' 
        }, 
        (payload) => {
          console.log('New post received:', payload);
          // Could add new post to top of feed
        })
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('Post updated:', payload);
          // Update post in current feed
          if (payload.new) {
            updatePostInFeed(payload.new.id, payload.new as Partial<Post>);
          }
        })
      .subscribe();
  }, [finalConfig.enableRealtime, updatePostInFeed]);

  /**
   * Cleanup subscriptions
   */
  const cleanupSubscriptions = useCallback((): void => {
    if (realtimeSubscription.current) {
      supabase.removeChannel(realtimeSubscription.current);
      realtimeSubscription.current = null;
    }
  }, []);

  /**
   * Initialize feed
   */
  useEffect(() => {
    if (!isInitialized.current) {
      loadFeed(false);
      setupRealtimeSubscription();
      isInitialized.current = true;
    }

    return cleanupSubscriptions;
  }, [loadFeed, setupRealtimeSubscription, cleanupSubscriptions]);

  // Return hook interface
  return {
    // State
    ...state,
    interactions,
    totalPosts,
    currentPage,
    
    // Actions
    loadFeed,
    loadMorePosts,
    refreshFeed,
    likePost,
    unlikePost,
    toggleLike,
    updatePostInFeed,
    changeAlgorithm,
    
    // Utilities
    getPostInteraction: (postId: string) => interactions[postId] || { 
      isLiked: false, 
      likeCount: 0, 
      commentCount: 0 
    },
  };
};