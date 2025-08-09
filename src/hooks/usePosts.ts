/**
 * usePosts Hook
 * Post management hook for creating and managing meal posts with Supabase integration
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { uploadMultipleImages } from '../lib/storage';
import { DiningType } from '../components/posts/DiningTypeSelector';
import { LocationData } from '../components/posts/LocationPicker';

export interface PostData {
  photos: string[]; // Local URIs or uploaded URLs
  restaurantName: string;
  cuisine: string;
  location?: LocationData;
  rating?: number; // 1-5 stars
  review?: string;
  diningType?: DiningType | 'dine-in' | 'takeout' | 'delivery'; // Support both old and new types
  isPrivate?: boolean;
}

export interface DraftData extends PostData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostResult {
  success: boolean;
  postId?: string;
  error?: string;
  navigateTo?: 'feed' | 'post-detail' | 'profile';
}

export interface PostValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[]; // Non-blocking issues
}

export interface PostSubmissionData extends PostData {
  submittedAt: string;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

const DRAFT_STORAGE_KEY = 'post_draft';

export const usePosts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Validate post data before submission
   */
  /**
   * Enhanced validation with warnings for better UX
   */
  const validatePost = useCallback((postData: PostData): PostValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!postData.photos || postData.photos.length === 0) {
      errors.push('At least one photo is required');
    }

    if (!postData.restaurantName?.trim()) {
      errors.push('Restaurant name is required');
    } else if (postData.restaurantName.length > 100) {
      errors.push('Restaurant name must be less than 100 characters');
    } else if (postData.restaurantName.length < 2) {
      warnings.push('Restaurant name seems very short');
    }

    if (!postData.cuisine?.trim()) {
      errors.push('Cuisine type is required');
    }

    // Optional field validation
    if (postData.rating && (postData.rating < 1 || postData.rating > 5)) {
      errors.push('Rating must be between 1 and 5 stars');
    }

    if (postData.review && postData.review.length > 500) {
      errors.push('Review must be less than 500 characters');
    } else if (postData.review && postData.review.length < 10) {
      warnings.push('Consider writing a longer review to help others');
    }

    // Photo validation
    if (postData.photos.length > 5) {
      errors.push('Maximum 5 photos allowed per post');
    } else if (postData.photos.length === 1) {
      warnings.push('Adding more photos can make your post more engaging');
    }

    // Location validation
    if (postData.location) {
      if (!postData.location.latitude || !postData.location.longitude) {
        warnings.push('Location coordinates are missing');
      }
      if (!postData.location.address || postData.location.address.trim().length < 5) {
        warnings.push('Location address seems incomplete');
      }
    }

    // Dining type validation
    if (postData.diningType) {
      const validDiningTypes = ['fine-dining', 'casual', 'fast-food', 'street-food', 'home-cooking', 'dine-in', 'takeout', 'delivery'];
      if (!validDiningTypes.includes(postData.diningType)) {
        warnings.push('Invalid dining type selected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  /**
   * Upload photos for post
   */
  const uploadPostPhotos = useCallback(async (photoUris: string[]): Promise<string[]> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log(`Uploading ${photoUris.length} photos...`);

      // Upload photos with progress tracking
      const uploadResult = await uploadMultipleImages(
        photoUris,
        user.id,
        {
          generateThumbnails: true,
          quality: 0.8,
          onProgress: (completed, total) => {
            const progress = (completed / total) * 100;
            setUploadProgress(progress);
          },
        }
      );

      if (!uploadResult.success || !uploadResult.results) {
        throw new Error('Failed to upload photos');
      }

      // Extract successful URLs
      const uploadedUrls = uploadResult.results
        .filter(result => result.success && result.url)
        .map(result => result.url!);

      if (uploadedUrls.length === 0) {
        throw new Error('No photos were successfully uploaded');
      }

      if (uploadedUrls.length < photoUris.length) {
        console.warn(`Only ${uploadedUrls.length} of ${photoUris.length} photos uploaded successfully`);
      }

      return uploadedUrls;

    } catch (error) {
      console.error('Error uploading photos:', error);
      throw error;
    }
  }, []);

  /**
   * Create a new post
   */
  const createPost = useCallback(async (postData: PostData): Promise<CreatePostResult> => {
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Validate post data
      const validation = validatePost(postData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload photos if they're local URIs
      let photoUrls = postData.photos;
      const localPhotos = postData.photos.filter(uri => 
        uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')
      );

      if (localPhotos.length > 0) {
        console.log('Uploading local photos...');
        photoUrls = await uploadPostPhotos(localPhotos);
      }

      // Create post in database
      console.log('Creating post in database...');
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          restaurant_name: postData.restaurantName.trim(),
          cuisine: postData.cuisine.trim(),
          location: postData.location ? {
            latitude: postData.location.latitude,
            longitude: postData.location.longitude,
            address: postData.location.address,
            accuracy: postData.location.accuracy,
          } : null,
          rating: postData.rating || null,
          review: postData.review?.trim() || null,
          dining_type: postData.diningType || null,
          is_private: postData.isPrivate || false,
          photo_urls: photoUrls,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (postError) {
        throw new Error(`Failed to create post: ${postError.message}`);
      }

      if (!post) {
        throw new Error('Post was created but no data returned');
      }

      // Update user cuisine progress and restaurant history
      await Promise.allSettled([
        // Update cuisine progress
        updateUserCuisineProgress(user.id, postData.cuisine.trim()),
        // Update restaurant history
        updateUserRestaurantHistory(user.id, postData.restaurantName.trim()),
        // Update dining type preferences
        updateUserDiningTypePreferences(user.id, postData.diningType),
      ]);

      // Clear draft on successful post creation
      await clearDraft();

      console.log('Post created successfully:', post.id);

      return {
        success: true,
        postId: post.id,
        navigateTo: 'feed',
      };

    } catch (error) {
      console.error('Error creating post:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [validatePost, uploadPostPhotos]);

  /**
   * Save draft to local storage
   */
  const saveDraft = useCallback(async (draftData: Omit<DraftData, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      const existingDraft = await loadDraft();
      const now = new Date().toISOString();
      
      const draft: DraftData = {
        ...draftData,
        id: existingDraft?.id || `draft_${Date.now()}`,
        createdAt: existingDraft?.createdAt || now,
        updatedAt: now,
      };

      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      console.log('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      throw new Error('Failed to save draft');
    }
  }, []);

  /**
   * Load draft from local storage
   */
  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    try {
      const draftJson = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (!draftJson) {
        return null;
      }

      const draft: DraftData = JSON.parse(draftJson);
      console.log('Draft loaded successfully');
      return draft;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, []);

  /**
   * Clear draft from local storage
   */
  const clearDraft = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      console.log('Draft cleared successfully');
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, []);

  /**
   * Check if draft exists
   */
  const hasDraft = useCallback(async (): Promise<boolean> => {
    try {
      const draftJson = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      return !!draftJson;
    } catch (error) {
      console.error('Error checking for draft:', error);
      return false;
    }
  }, []);

  /**
   * Get user's recent restaurants for autocomplete
   */
  const getRecentRestaurants = useCallback(async (limit: number = 10): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data: posts, error } = await supabase
        .from('posts')
        .select('restaurant_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to account for duplicates

      if (error) {
        console.warn('Error fetching recent restaurants:', error);
        return [];
      }

      // Remove duplicates and limit results
      const uniqueRestaurants = [...new Set(posts.map(p => p.restaurant_name))]
        .slice(0, limit);

      return uniqueRestaurants;
    } catch (error) {
      console.error('Error getting recent restaurants:', error);
      return [];
    }
  }, []);

  /**
   * Get popular cuisines for user
   */
  const getPopularCuisines = useCallback(async (limit: number = 10): Promise<string[]> => {
    try {
      const { data: cuisines, error } = await supabase
        .from('user_cuisine_progress')
        .select('cuisine, count')
        .order('count', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Error fetching popular cuisines:', error);
        return [];
      }

      return cuisines.map(c => c.cuisine);
    } catch (error) {
      console.error('Error getting popular cuisines:', error);
      return [];
    }
  }, []);

  /**
   * Update user cuisine progress
   */
  const updateUserCuisineProgress = useCallback(async (userId: string, cuisine: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('user_cuisine_progress')
        .upsert({
          user_id: userId,
          cuisine: cuisine.trim(),
          count: 1,
          last_tried: new Date().toISOString(),
        }, {
          onConflict: 'user_id,cuisine',
        });

      if (error) {
        console.warn('Failed to update cuisine progress:', error);
      }
    } catch (error) {
      console.warn('Error updating cuisine progress:', error);
    }
  }, []);

  /**
   * Update user restaurant history
   */
  const updateUserRestaurantHistory = useCallback(async (userId: string, restaurantName: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('user_restaurant_history')
        .upsert({
          user_id: userId,
          restaurant_name: restaurantName.trim(),
          visit_count: 1,
          last_visited: new Date().toISOString(),
        }, {
          onConflict: 'user_id,restaurant_name',
        });

      if (error) {
        console.warn('Failed to update restaurant history:', error);
      }
    } catch (error) {
      console.warn('Error updating restaurant history:', error);
    }
  }, []);

  /**
   * Update user dining type preferences
   */
  const updateUserDiningTypePreferences = useCallback(async (userId: string, diningType?: string): Promise<void> => {
    if (!diningType) return;

    try {
      const { error } = await supabase
        .from('user_dining_preferences')
        .upsert({
          user_id: userId,
          dining_type: diningType,
          preference_count: 1,
          last_used: new Date().toISOString(),
        }, {
          onConflict: 'user_id,dining_type',
        });

      if (error) {
        console.warn('Failed to update dining type preferences:', error);
      }
    } catch (error) {
      console.warn('Error updating dining type preferences:', error);
    }
  }, []);

  /**
   * Submit post with comprehensive validation and navigation
   */
  const submitPostWithNavigation = useCallback(async (
    postData: PostData,
    onSuccess?: (result: CreatePostResult) => void
  ): Promise<CreatePostResult> => {
    const result = await createPost(postData);
    
    if (result.success && onSuccess) {
      onSuccess(result);
    }
    
    return result;
  }, [createPost]);

  /**
   * Get user's dining type preferences
   */
  const getUserDiningTypePreferences = useCallback(async (): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: preferences, error } = await supabase
        .from('user_dining_preferences')
        .select('dining_type, preference_count')
        .eq('user_id', user.id)
        .order('preference_count', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Error fetching dining type preferences:', error);
        return [];
      }

      return preferences.map(p => p.dining_type);
    } catch (error) {
      console.error('Error getting dining type preferences:', error);
      return [];
    }
  }, []);

  /**
   * Get nearby restaurants based on location
   */
  const getNearbyRestaurants = useCallback(async (location: LocationData, radius: number = 5): Promise<string[]> => {
    try {
      // This would typically use a geospatial query
      // For now, return mock data based on location
      const mockRestaurants = [
        'Local Bistro',
        'Corner Cafe',
        'Main Street Deli',
        'Plaza Restaurant',
        'Downtown Grill',
      ];
      
      return mockRestaurants;
    } catch (error) {
      console.error('Error getting nearby restaurants:', error);
      return [];
    }
  }, []);

  return {
    // State
    isLoading,
    uploadProgress,
    error,
    
    // Core Actions
    createPost,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    validatePost,
    uploadPostPhotos,
    clearError,
    
    // Enhanced Actions
    submitPostWithNavigation,
    updateUserCuisineProgress,
    updateUserRestaurantHistory,
    updateUserDiningTypePreferences,
    
    // Data Fetching
    getRecentRestaurants,
    getPopularCuisines,
    getUserDiningTypePreferences,
    getNearbyRestaurants,
  };
};