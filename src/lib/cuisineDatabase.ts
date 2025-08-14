/**
 * Cuisine Database Operations
 * Comprehensive Supabase integration for cuisine progress tracking
 */

import { supabase, getCurrentUser } from './supabase';
import {
  Cuisine,
  UserCuisineProgress,
  Achievement,
  ProgressStats,
} from '../types/cuisine';

// Database Response Types
export interface DatabaseResponse<T> {
  data: T | null;
  error: string | null;
}

// Query Options
export interface CuisineQueryOptions {
  category?: string;
  includeProgress?: boolean;
  orderBy?: 'name' | 'category' | 'created_at';
  ascending?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProgressQueryOptions {
  includeEmptyProgress?: boolean;
  timeRange?: {
    start: string;
    end: string;
  };
  orderBy?: 'first_tried_at' | 'times_tried' | 'created_at';
  ascending?: boolean;
}

// =============================================================================
// CUISINE OPERATIONS
// =============================================================================

/**
 * Fetch all cuisines with optional filtering and pagination
 */
export async function fetchAllCuisines(
  options: CuisineQueryOptions = {}
): Promise<DatabaseResponse<Cuisine[]>> {
  try {
    console.log('🍽️ Fetching cuisines with options:', options);

    let query = supabase
      .from('cuisines')
      .select('*');

    // Apply category filter
    if (options.category) {
      query = query.eq('category', options.category);
    }

    // Apply ordering
    const orderColumn = options.orderBy || 'name';
    const ascending = options.ascending !== false; // Default to ascending
    query = query.order(orderColumn, { ascending });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching cuisines:', error);
      return { data: null, error: error.message };
    }

    console.log(`✅ Fetched ${data?.length || 0} cuisines`);
    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Exception in fetchAllCuisines:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Fetch cuisine by ID with optional progress information
 */
export async function fetchCuisineById(
  cuisineId: number,
  includeProgress = false
): Promise<DatabaseResponse<Cuisine & { userProgress?: UserCuisineProgress }>> {
  try {
    console.log(`🍽️ Fetching cuisine ${cuisineId}, includeProgress: ${includeProgress}`);

    const { data: cuisine, error: cuisineError } = await supabase
      .from('cuisines')
      .select('*')
      .eq('id', cuisineId)
      .single();

    if (cuisineError) {
      console.error('❌ Error fetching cuisine:', cuisineError);
      return { data: null, error: cuisineError.message };
    }

    if (!cuisine) {
      return { data: null, error: 'Cuisine not found' };
    }

    let result: Cuisine & { userProgress?: UserCuisineProgress } = cuisine;

    // Fetch user progress if requested
    if (includeProgress) {
      const user = await getCurrentUser();
      if (user) {
        const progressResponse = await fetchUserProgressForCuisine(user.id, cuisineId);
        if (progressResponse.data) {
          result.userProgress = progressResponse.data;
        }
      }
    }

    console.log('✅ Fetched cuisine successfully');
    return { data: result, error: null };
  } catch (error) {
    console.error('❌ Exception in fetchCuisineById:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// =============================================================================
// USER PROGRESS OPERATIONS
// =============================================================================

/**
 * Fetch user's cuisine progress with comprehensive data
 */
export async function fetchUserProgress(
  userId: string,
  options: ProgressQueryOptions = {}
): Promise<DatabaseResponse<UserCuisineProgress[]>> {
  try {
    console.log(`👤 Fetching progress for user ${userId} with options:`, options);

    let query = supabase
      .from('user_cuisine_progress')
      .select(`
        *,
        cuisine:cuisines(
          id,
          name,
          category,
          emoji,
          description,
          origin_country,
          created_at
        )
      `)
      .eq('user_id', userId);

    // Apply time range filter
    if (options.timeRange) {
      query = query
        .gte('first_tried_at', options.timeRange.start)
        .lte('first_tried_at', options.timeRange.end);
    }

    // Apply ordering
    const orderColumn = options.orderBy || 'first_tried_at';
    const ascending = options.ascending !== false;
    query = query.order(orderColumn, { ascending });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching user progress:', error);
      return { data: null, error: error.message };
    }

    console.log(`✅ Fetched ${data?.length || 0} progress entries`);
    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Exception in fetchUserProgress:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Fetch user progress for specific cuisine
 */
export async function fetchUserProgressForCuisine(
  userId: string,
  cuisineId: number
): Promise<DatabaseResponse<UserCuisineProgress>> {
  try {
    console.log(`👤 Fetching progress for user ${userId}, cuisine ${cuisineId}`);

    const { data, error } = await supabase
      .from('user_cuisine_progress')
      .select(`
        *,
        cuisine:cuisines(*)
      `)
      .eq('user_id', userId)
      .eq('cuisine_id', cuisineId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching cuisine progress:', error);
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (error) {
    console.error('❌ Exception in fetchUserProgressForCuisine:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Create new cuisine progress entry
 */
export async function createCuisineProgress(
  userId: string,
  cuisineId: number,
  restaurantName: string,
  notes?: string,
  rating?: number
): Promise<DatabaseResponse<UserCuisineProgress>> {
  try {
    console.log(`➕ Creating progress entry for user ${userId}, cuisine ${cuisineId}`);

    // Validate inputs
    if (!userId || !cuisineId || !restaurantName.trim()) {
      return { data: null, error: 'Missing required fields' };
    }

    // Check if progress already exists
    const existingResponse = await fetchUserProgressForCuisine(userId, cuisineId);
    if (existingResponse.data) {
      return { data: null, error: 'Progress already exists for this cuisine' };
    }

    const progressData = {
      user_id: userId,
      cuisine_id: cuisineId,
      first_tried_at: new Date().toISOString(),
      times_tried: 1,
      favorite_restaurant: restaurantName.trim(),
      notes: notes?.trim() || null,
      rating: rating || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_cuisine_progress')
      .insert(progressData)
      .select(`
        *,
        cuisine:cuisines(*)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating cuisine progress:', error);
      return { data: null, error: error.message };
    }

    console.log('✅ Created cuisine progress entry');
    return { data, error: null };
  } catch (error) {
    console.error('❌ Exception in createCuisineProgress:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Update existing cuisine progress
 */
export async function updateCuisineProgress(
  progressId: string,
  updates: Partial<UserCuisineProgress>
): Promise<DatabaseResponse<UserCuisineProgress>> {
  try {
    console.log(`✏️ Updating progress entry ${progressId}:`, updates);

    // Validate input
    if (!progressId) {
      return { data: null, error: 'Progress ID is required' };
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.cuisine_id;
    delete updateData.first_tried_at;
    delete updateData.created_at;
    delete updateData.cuisine;

    const { data, error } = await supabase
      .from('user_cuisine_progress')
      .update(updateData)
      .eq('id', progressId)
      .select(`
        *,
        cuisine:cuisines(*)
      `)
      .single();

    if (error) {
      console.error('❌ Error updating cuisine progress:', error);
      return { data: null, error: error.message };
    }

    console.log('✅ Updated cuisine progress entry');
    return { data, error: null };
  } catch (error) {
    console.error('❌ Exception in updateCuisineProgress:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Increment times tried for existing progress
 */
export async function incrementTimesTried(
  progressId: string,
  restaurantName?: string
): Promise<DatabaseResponse<UserCuisineProgress>> {
  try {
    console.log(`🔄 Incrementing times tried for progress ${progressId}`);

    // First get current progress
    const { data: currentProgress, error: fetchError } = await supabase
      .from('user_cuisine_progress')
      .select('times_tried, favorite_restaurant')
      .eq('id', progressId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current progress:', fetchError);
      return { data: null, error: fetchError.message };
    }

    const updates: Partial<UserCuisineProgress> = {
      times_tried: (currentProgress.times_tried || 0) + 1,
    };

    // Update favorite restaurant if provided
    if (restaurantName?.trim()) {
      updates.favorite_restaurant = restaurantName.trim();
    }

    return await updateCuisineProgress(progressId, updates);
  } catch (error) {
    console.error('❌ Exception in incrementTimesTried:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Delete cuisine progress entry
 */
export async function deleteCuisineProgress(
  progressId: string
): Promise<DatabaseResponse<boolean>> {
  try {
    console.log(`🗑️ Deleting progress entry ${progressId}`);

    if (!progressId) {
      return { data: false, error: 'Progress ID is required' };
    }

    const { error } = await supabase
      .from('user_cuisine_progress')
      .delete()
      .eq('id', progressId);

    if (error) {
      console.error('❌ Error deleting cuisine progress:', error);
      return { data: false, error: error.message };
    }

    console.log('✅ Deleted cuisine progress entry');
    return { data: true, error: null };
  } catch (error) {
    console.error('❌ Exception in deleteCuisineProgress:', error);
    return { 
      data: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Fetch cuisine data with user progress in a single optimized query
 */
export async function fetchCuisinesWithProgress(
  userId: string,
  options: CuisineQueryOptions = {}
): Promise<DatabaseResponse<(Cuisine & { userProgress?: UserCuisineProgress })[]>> {
  try {
    console.log(`🔄 Fetching cuisines with progress for user ${userId}`);

    // First fetch all cuisines
    const cuisinesResponse = await fetchAllCuisines(options);
    if (cuisinesResponse.error || !cuisinesResponse.data) {
      return cuisinesResponse as any;
    }

    // Then fetch user progress
    const progressResponse = await fetchUserProgress(userId);
    if (progressResponse.error) {
      console.error('Warning: Could not fetch user progress:', progressResponse.error);
      // Continue with cuisines only
      return { data: cuisinesResponse.data, error: null };
    }

    // Merge the data
    const progressMap = new Map(
      (progressResponse.data || []).map(p => [p.cuisine_id, p])
    );

    const result = cuisinesResponse.data.map(cuisine => ({
      ...cuisine,
      userProgress: progressMap.get(cuisine.id),
    }));

    console.log(`✅ Merged ${result.length} cuisines with progress data`);
    return { data: result, error: null };
  } catch (error) {
    console.error('❌ Exception in fetchCuisinesWithProgress:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// =============================================================================
// STATISTICS AND ANALYTICS
// =============================================================================

/**
 * Get cuisine statistics for user
 */
export async function getCuisineStatistics(
  userId: string
): Promise<DatabaseResponse<{
  totalCuisines: number;
  triedCuisines: number;
  categoryCounts: Record<string, { total: number; tried: number }>;
  recentActivity: UserCuisineProgress[];
}>> {
  try {
    console.log(`📊 Getting cuisine statistics for user ${userId}`);

    // Get all cuisines and user progress in parallel
    const [cuisinesResponse, progressResponse] = await Promise.all([
      fetchAllCuisines(),
      fetchUserProgress(userId, { orderBy: 'first_tried_at', ascending: false })
    ]);

    if (cuisinesResponse.error) {
      return { data: null, error: cuisinesResponse.error };
    }

    const cuisines = cuisinesResponse.data || [];
    const progress = progressResponse.data || [];

    // Calculate category statistics
    const categoryCounts: Record<string, { total: number; tried: number }> = {};
    const triedCuisineIds = new Set(progress.map(p => p.cuisine_id));

    cuisines.forEach(cuisine => {
      if (!categoryCounts[cuisine.category]) {
        categoryCounts[cuisine.category] = { total: 0, tried: 0 };
      }
      categoryCounts[cuisine.category].total++;
      
      if (triedCuisineIds.has(cuisine.id)) {
        categoryCounts[cuisine.category].tried++;
      }
    });

    const statistics = {
      totalCuisines: cuisines.length,
      triedCuisines: progress.length,
      categoryCounts,
      recentActivity: progress.slice(0, 10), // Last 10 activities
    };

    console.log('✅ Generated cuisine statistics');
    return { data: statistics, error: null };
  } catch (error) {
    console.error('❌ Exception in getCuisineStatistics:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate cuisine progress data before database operations
 */
export function validateProgressData(data: Partial<UserCuisineProgress>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.user_id && typeof data.user_id !== 'string') {
    errors.push('User ID must be a string');
  }

  if (data.cuisine_id && (!Number.isInteger(data.cuisine_id) || data.cuisine_id <= 0)) {
    errors.push('Cuisine ID must be a positive integer');
  }

  if (data.times_tried && (!Number.isInteger(data.times_tried) || data.times_tried < 0)) {
    errors.push('Times tried must be a non-negative integer');
  }

  if (data.rating && (data.rating < 1 || data.rating > 5)) {
    errors.push('Rating must be between 1 and 5');
  }

  if (data.favorite_restaurant && data.favorite_restaurant.trim().length === 0) {
    errors.push('Restaurant name cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input for database operations
 */
export function sanitizeProgressInput(data: Partial<UserCuisineProgress>): Partial<UserCuisineProgress> {
  const sanitized: Partial<UserCuisineProgress> = {};

  if (data.favorite_restaurant) {
    sanitized.favorite_restaurant = data.favorite_restaurant.trim().slice(0, 255);
  }

  if (data.notes) {
    sanitized.notes = data.notes.trim().slice(0, 1000);
  }

  if (data.rating) {
    sanitized.rating = Math.max(1, Math.min(5, Math.round(data.rating)));
  }

  if (data.times_tried) {
    sanitized.times_tried = Math.max(0, Math.round(data.times_tried));
  }

  return sanitized;
}