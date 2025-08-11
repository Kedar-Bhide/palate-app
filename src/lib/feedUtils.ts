/**
 * Feed Utilities
 * Feed algorithms, sorting, filtering, and optimization functions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, User } from '../types';

// Cache keys
const FEED_CACHE_KEY = 'feed_cache';
const USER_PREFERENCES_KEY = 'user_preferences';
const BLOCKED_USERS_KEY = 'blocked_users';
const MUTED_KEYWORDS_KEY = 'muted_keywords';

// Feed algorithm types
export type FeedAlgorithm = 'recent' | 'popular' | 'friends' | 'discovery';

// Feed filters
export interface FeedFilters {
  cuisines?: string[];
  diningTypes?: string[];
  ratings?: number[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in km
  };
}

// User preferences for feed customization
export interface UserFeedPreferences {
  algorithm: FeedAlgorithm;
  filters: FeedFilters;
  blockedUsers: string[];
  mutedKeywords: string[];
  showPrivatePosts: boolean;
  autoplayVideos: boolean;
  pushNotifications: boolean;
}

// Post engagement metrics
export interface PostEngagement {
  postId: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  engagementRate: number;
  recencyScore: number;
  friendsEngagement: number;
}

// Feed pagination result
export interface PaginatedFeed {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount: number;
}

/**
 * Sort posts by different algorithms
 */
export const sortPostsByAlgorithm = (posts: Post[], algorithm: FeedAlgorithm = 'recent'): Post[] => {
  const sortedPosts = [...posts];

  switch (algorithm) {
    case 'recent':
      return sortedPosts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    case 'popular':
      return sortedPosts.sort((a, b) => {
        const engagementA = calculatePostEngagement(a);
        const engagementB = calculatePostEngagement(b);
        return engagementB - engagementA;
      });

    case 'friends':
      // Prioritize posts from friends, then sort by recency
      return sortedPosts.sort((a, b) => {
        // This would need to be enhanced with actual friendship data
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      });

    case 'discovery':
      // Mix of popular posts from different cuisines and locations
      return sortedPosts.sort((a, b) => {
        const scoreA = calculateDiscoveryScore(a);
        const scoreB = calculateDiscoveryScore(b);
        return scoreB - scoreA;
      });

    default:
      return sortedPosts;
  }
};

/**
 * Calculate post engagement score
 */
export const calculatePostEngagement = (post: Post): number => {
  // Mock engagement calculation - in real app, this would come from database
  const baseScore = Math.random() * 100; // Mock score
  
  // Factors that increase engagement:
  // - Recent posts get higher scores
  const recencyScore = getRecencyScore(post.created_at);
  
  // - Posts with photos get higher scores
  const photoScore = post.photo_urls.length * 10;
  
  // - Posts with reviews get higher scores
  const reviewScore = post.review_text ? 15 : 0;
  
  // - Posts with ratings get higher scores
  const ratingScore = post.rating ? post.rating * 5 : 0;
  
  return baseScore + recencyScore + photoScore + reviewScore + ratingScore;
};

/**
 * Calculate discovery score for posts
 */
const calculateDiscoveryScore = (post: Post): number => {
  const baseEngagement = calculatePostEngagement(post);
  
  // Add diversity bonus for different cuisines
  const cuisineBonus = Math.random() * 20; // Would be based on user's cuisine history
  
  // Add location bonus for nearby posts
  const locationBonus = Math.random() * 15; // Would be based on user's location
  
  // Recent posts get slight preference
  const recencyBonus = getRecencyScore(post.created_at) * 0.3;
  
  return baseEngagement + cuisineBonus + locationBonus + recencyBonus;
};

/**
 * Get recency score based on post age
 */
const getRecencyScore = (createdAt: string): number => {
  const now = new Date().getTime();
  const postTime = new Date(createdAt).getTime();
  const ageInHours = (now - postTime) / (1000 * 60 * 60);
  
  // Posts lose score over time
  if (ageInHours < 1) return 50;
  if (ageInHours < 6) return 40;
  if (ageInHours < 24) return 30;
  if (ageInHours < 72) return 20;
  if (ageInHours < 168) return 10; // 1 week
  return 0;
};

/**
 * Filter posts by user preferences
 */
export const filterPostsByUserPreferences = async (
  posts: Post[], 
  userId: string
): Promise<Post[]> => {
  try {
    const preferences = await getUserFeedPreferences(userId);
    let filteredPosts = [...posts];

    // Filter by blocked users
    if (preferences.blockedUsers.length > 0) {
      filteredPosts = filteredPosts.filter(
        post => !preferences.blockedUsers.includes(post.user_id)
      );
    }

    // Filter by muted keywords
    if (preferences.mutedKeywords.length > 0) {
      filteredPosts = filteredPosts.filter(post => {
        const text = `${post.restaurant_name} ${post.review_text || ''}`.toLowerCase();
        return !preferences.mutedKeywords.some(keyword => 
          text.includes(keyword.toLowerCase())
        );
      });
    }

    // Filter by cuisine preferences
    if (preferences.filters.cuisines && preferences.filters.cuisines.length > 0) {
      filteredPosts = filteredPosts.filter(post => {
        let cuisineName = '';
        if (typeof post.cuisine === 'string') {
          cuisineName = post.cuisine;
        } else if (post.cuisine && typeof post.cuisine === 'object') {
          cuisineName = post.cuisine.name || '';
        }
        return cuisineName && preferences.filters.cuisines!.includes(cuisineName);
      });
    }

    // Filter by dining type preferences
    if (preferences.filters.diningTypes && preferences.filters.diningTypes.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        post.dining_type && preferences.filters.diningTypes!.includes(post.dining_type)
      );
    }

    // Filter by rating preferences
    if (preferences.filters.ratings && preferences.filters.ratings.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        post.rating && preferences.filters.ratings!.includes(post.rating)
      );
    }

    // Filter by time range
    if (preferences.filters.timeRange) {
      const { start, end } = preferences.filters.timeRange;
      filteredPosts = filteredPosts.filter(post => {
        const postDate = new Date(post.created_at);
        return postDate >= start && postDate <= end;
      });
    }

    // Filter private posts
    if (!preferences.showPrivatePosts) {
      filteredPosts = filteredPosts.filter(post => !post.is_private);
    }

    return filteredPosts;

  } catch (error) {
    console.error('Error filtering posts by preferences:', error);
    return posts; // Return unfiltered posts on error
  }
};

/**
 * Paginate feed results
 */
export const paginateFeed = (
  posts: Post[], 
  page: number, 
  limit: number = 10
): PaginatedFeed => {
  const startIndex = page * limit;
  const endIndex = startIndex + limit;
  const paginatedPosts = posts.slice(startIndex, endIndex);
  const hasMore = endIndex < posts.length;

  return {
    posts: paginatedPosts,
    hasMore,
    nextCursor: hasMore ? `page_${page + 1}` : undefined,
    totalCount: posts.length,
  };
};

/**
 * Check if post should be shown to user
 */
export const shouldShowPost = async (post: Post, currentUser: User): Promise<boolean> => {
  try {
    // Don't show user's own posts in main feed
    if (post.user_id === currentUser.id) {
      return false;
    }

    // Check if user is blocked
    const preferences = await getUserFeedPreferences(currentUser.id);
    if (preferences.blockedUsers.includes(post.user_id)) {
      return false;
    }

    // Check for muted keywords
    if (preferences.mutedKeywords.length > 0) {
      const text = `${post.restaurant_name} ${post.review_text || ''}`.toLowerCase();
      const hasMutedKeyword = preferences.mutedKeywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
      if (hasMutedKeyword) {
        return false;
      }
    }

    // Check privacy settings
    if (post.is_private) {
      // Would need to check friendship status here
      // For now, hide all private posts from non-friends
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error checking if post should be shown:', error);
    return true; // Show post on error to be safe
  }
};

/**
 * Get user feed preferences
 */
export const getUserFeedPreferences = async (userId: string): Promise<UserFeedPreferences> => {
  try {
    const preferencesJson = await AsyncStorage.getItem(`${USER_PREFERENCES_KEY}_${userId}`);
    
    if (preferencesJson) {
      return JSON.parse(preferencesJson);
    }

    // Default preferences
    return {
      algorithm: 'recent',
      filters: {},
      blockedUsers: [],
      mutedKeywords: [],
      showPrivatePosts: false,
      autoplayVideos: true,
      pushNotifications: true,
    };

  } catch (error) {
    console.error('Error getting user preferences:', error);
    return {
      algorithm: 'recent',
      filters: {},
      blockedUsers: [],
      mutedKeywords: [],
      showPrivatePosts: false,
      autoplayVideos: true,
      pushNotifications: true,
    };
  }
};

/**
 * Save user feed preferences
 */
export const saveUserFeedPreferences = async (
  userId: string, 
  preferences: UserFeedPreferences
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      `${USER_PREFERENCES_KEY}_${userId}`,
      JSON.stringify(preferences)
    );
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
};

/**
 * Cache feed data for offline viewing
 */
export const cacheFeedData = async (posts: Post[], userId: string): Promise<void> => {
  try {
    const cacheData = {
      posts,
      timestamp: new Date().toISOString(),
      userId,
    };
    
    await AsyncStorage.setItem(
      `${FEED_CACHE_KEY}_${userId}`,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error('Error caching feed data:', error);
  }
};

/**
 * Get cached feed data
 */
export const getCachedFeedData = async (userId: string): Promise<Post[] | null> => {
  try {
    const cacheJson = await AsyncStorage.getItem(`${FEED_CACHE_KEY}_${userId}`);
    
    if (cacheJson) {
      const cacheData = JSON.parse(cacheJson);
      
      // Check if cache is still valid (e.g., less than 1 hour old)
      const cacheAge = new Date().getTime() - new Date(cacheData.timestamp).getTime();
      const maxCacheAge = 60 * 60 * 1000; // 1 hour
      
      if (cacheAge < maxCacheAge) {
        return cacheData.posts;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached feed data:', error);
    return null;
  }
};

/**
 * Clear feed cache
 */
export const clearFeedCache = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${FEED_CACHE_KEY}_${userId}`);
  } catch (error) {
    console.error('Error clearing feed cache:', error);
  }
};

/**
 * Shuffle array for discovery algorithm
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Diversify feed by ensuring variety in cuisines and users
 */
export const diversifyFeed = (posts: Post[]): Post[] => {
  const diversified: Post[] = [];
  const seenCuisines = new Set<string>();
  const seenUsers = new Set<string>();
  
  // First pass: Add posts from different cuisines and users
  for (const post of posts) {
    let cuisineName = 'unknown';
    if (typeof post.cuisine === 'string') {
      cuisineName = post.cuisine;
    } else if (post.cuisine && typeof post.cuisine === 'object') {
      cuisineName = post.cuisine.name || 'unknown';
    }
    
    const userId = post.user_id;
    
    if (!seenCuisines.has(cuisineName) && !seenUsers.has(userId)) {
      diversified.push(post);
      seenCuisines.add(cuisineName);
      seenUsers.add(userId);
    }
  }
  
  // Second pass: Add remaining posts
  for (const post of posts) {
    if (!diversified.includes(post)) {
      diversified.push(post);
    }
  }
  
  return diversified;
};