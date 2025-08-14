import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import {
  Cuisine,
  UserCuisineProgress,
  ProgressStats,
  Achievement
} from '../types/cuisine';
import { useAchievements } from './useAchievements';
import {
  calculateProgress,
  detectNewAchievements,
  detectEnhancedAchievements,
  getProgressGoals,
  calculateEnhancedDiversityScore,
  getEnhancedCuisineStreak,
  getEnhancedMonthlyProgress,
  predictNextCuisines,
} from '../lib/cuisineUtils';
import {
  fetchAllCuisines,
  fetchUserProgress,
  createCuisineProgress,
  updateCuisineProgress,
  incrementTimesTried,
  getCuisineStatistics,
  validateProgressData,
  sanitizeProgressInput,
} from '../lib/cuisineDatabase';

export function useCuisineProgress() {
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [userProgress, setUserProgress] = useState<UserCuisineProgress[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalCuisines: 0,
    triedCuisines: 0,
    percentage: 0,
    diversityScore: 0,
    currentStreak: 0,
    monthlyProgress: 0,
    nextGoal: { goal: 5, remaining: 5 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<Achievement[]>([]);
  const [isCheckingAchievements, setIsCheckingAchievements] = useState(false);
  
  // Achievement system integration
  const {
    achievements,
    checkAchievements,
    unlockAchievement,
    getNextAchievements,
    recentlyUnlocked,
    clearRecentlyUnlocked,
  } = useAchievements();


  const loadCuisines = useCallback(async () => {
    try {
      const response = await fetchAllCuisines({ orderBy: 'name', ascending: true });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setCuisines(response.data || []);
      return response.data || [];
    } catch (err) {
      console.error('Error loading cuisines:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cuisines');
      return [];
    }
  }, []);

  const loadUserProgress = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setUserProgress([]);
        return [];
      }

      const response = await fetchUserProgress(user.id, {
        orderBy: 'first_tried_at',
        ascending: false
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const progressData = response.data || [];
      setUserProgress(progressData);
      return progressData;
    } catch (err) {
      console.error('Error loading user progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
      return [];
    }
  }, []);

  const loadCuisineProgress = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [cuisinesData, progressData] = await Promise.all([
        loadCuisines(),
        loadUserProgress()
      ]);

      // Calculate enhanced progress stats
      const enhancedStats = {
        totalCuisines: cuisinesData.length,
        triedCuisines: progressData.length,
        percentage: cuisinesData.length > 0 ? Math.round((progressData.length / cuisinesData.length) * 100) : 0,
        diversityScore: calculateEnhancedDiversityScore(progressData, cuisinesData),
        currentStreak: getEnhancedCuisineStreak(progressData),
        monthlyProgress: getEnhancedMonthlyProgress(progressData).thisMonth,
        nextGoal: getNextGoal(progressData.length)
      };
      setStats(enhancedStats);

      // Check for newly unlocked achievements
      const newlyUnlocked = checkAchievements(progressData, cuisinesData);
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(achievement => {
          unlockAchievement(achievement.id);
        });
        setCelebrationQueue(prev => [...prev, ...newlyUnlocked]);
      }

    } catch (err) {
      console.error('Error loading cuisine progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadCuisines, loadUserProgress]);

  const markCuisineTried = useCallback(async (cuisineId: number, restaurantName: string, notes?: string, rating?: number) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate and sanitize input
      const sanitizedData = sanitizeProgressInput({
        favorite_restaurant: restaurantName,
        notes,
        rating
      });
      
      const validation = validateProgressData({
        user_id: user.id,
        cuisine_id: cuisineId,
        ...sanitizedData
      });
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if already tried
      const existingProgress = userProgress.find(p => p.cuisine_id === cuisineId);
      
      if (existingProgress) {
        // Increment times tried for existing progress
        const response = await incrementTimesTried(existingProgress.id, sanitizedData.favorite_restaurant);
        
        if (response.error) {
          throw new Error(response.error);
        }

        // Update local state
        setUserProgress(prev => prev.map(p => 
          p.id === existingProgress.id && response.data
            ? response.data
            : p
        ));
      } else {
        // Create new progress entry
        const response = await createCuisineProgress(
          user.id,
          cuisineId,
          sanitizedData.favorite_restaurant || restaurantName,
          sanitizedData.notes,
          sanitizedData.rating
        );
        
        if (response.error) {
          throw new Error(response.error);
        }

        if (response.data) {
          const newProgress = [...userProgress, response.data];
          setUserProgress(newProgress);

          // Update enhanced stats
          const enhancedStats = {
            totalCuisines: cuisines.length,
            triedCuisines: newProgress.length,
            percentage: cuisines.length > 0 ? Math.round((newProgress.length / cuisines.length) * 100) : 0,
            diversityScore: calculateEnhancedDiversityScore(newProgress, cuisines),
            currentStreak: getEnhancedCuisineStreak(newProgress),
            monthlyProgress: getEnhancedMonthlyProgress(newProgress).thisMonth,
            nextGoal: getNextGoal(newProgress.length)
          };
          setStats(enhancedStats);

          // Check for newly unlocked achievements
          setIsCheckingAchievements(true);
          const newlyUnlocked = checkAchievements(newProgress, cuisines);
          if (newlyUnlocked.length > 0) {
            newlyUnlocked.forEach(achievement => {
              unlockAchievement(achievement.id);
            });
            setCelebrationQueue(prev => [...prev, ...newlyUnlocked]);
          }
          setIsCheckingAchievements(false);
        }
      }
    } catch (err) {
      console.error('Error marking cuisine as tried:', err);
      throw err;
    }
  }, [userProgress, cuisines]);

  const updateFavoriteRestaurant = useCallback(async (cuisineId: number, restaurantName: string) => {
    try {
      const progressItem = userProgress.find(p => p.cuisine_id === cuisineId);
      if (!progressItem) {
        throw new Error('Cuisine not tried yet');
      }

      // Sanitize input
      const sanitizedData = sanitizeProgressInput({ favorite_restaurant: restaurantName });
      
      const response = await updateCuisineProgress(progressItem.id, {
        favorite_restaurant: sanitizedData.favorite_restaurant
      });
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local state
      if (response.data) {
        setUserProgress(prev => prev.map(p => 
          p.id === progressItem.id ? response.data! : p
        ));
      }
    } catch (err) {
      console.error('Error updating favorite restaurant:', err);
      throw err;
    }
  }, [userProgress]);

  const getCuisineProgress = useCallback((cuisineId: number): UserCuisineProgress | null => {
    return userProgress.find(p => p.cuisine_id === cuisineId) || null;
  }, [userProgress]);

  const calculateUserStats = useCallback((): ProgressStats => {
    return {
      totalCuisines: cuisines.length,
      triedCuisines: userProgress.length,
      percentage: cuisines.length > 0 ? Math.round((userProgress.length / cuisines.length) * 100) : 0,
      diversityScore: calculateEnhancedDiversityScore(userProgress, cuisines),
      currentStreak: getEnhancedCuisineStreak(userProgress),
      monthlyProgress: getEnhancedMonthlyProgress(userProgress).thisMonth,
      nextGoal: getNextGoal(userProgress.length)
    };
  }, [userProgress, cuisines]);

  const checkForNewAchievements = useCallback((): Achievement[] => {
    return checkAchievements(userProgress, cuisines);
  }, [userProgress, cuisines, checkAchievements]);

  const refreshData = useCallback(() => {
    loadCuisineProgress();
  }, [loadCuisineProgress]);

  // Enhanced helper functions
  const getPredictedCuisines = useCallback((limit = 5) => {
    return predictNextCuisines(userProgress, cuisines, limit);
  }, [userProgress, cuisines]);

  const getDiversityMetrics = useCallback(() => {
    return {
      score: calculateEnhancedDiversityScore(userProgress, cuisines),
      streak: getEnhancedCuisineStreak(userProgress),
      monthlyProgress: getEnhancedMonthlyProgress(userProgress)
    };
  }, [userProgress, cuisines]);

  const getCuisineStats = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const response = await getCuisineStatistics(user.id);
    return response.data;
  }, []);

  // Celebration management functions
  const getNextCelebration = useCallback((): Achievement | null => {
    return celebrationQueue.length > 0 ? celebrationQueue[0] : null;
  }, [celebrationQueue]);

  const dismissCelebration = useCallback(() => {
    setCelebrationQueue(prev => prev.slice(1));
  }, []);

  const clearCelebrationQueue = useCallback(() => {
    setCelebrationQueue([]);
  }, []);

  // Helper function for getting next goal
  const getNextGoal = useCallback((currentCount: number) => {
    const goals = [5, 10, 25, 50, 100];
    const nextGoal = goals.find(goal => goal > currentCount) || goals[goals.length - 1];
    return {
      goal: nextGoal,
      remaining: Math.max(0, nextGoal - currentCount)
    };
  }, []);


  // Initial load
  useEffect(() => {
    loadCuisineProgress();
  }, [loadCuisineProgress]);


  return {
    cuisines,
    userProgress,
    stats,
    achievements,
    loading,
    error,
    isCheckingAchievements,
    celebrationQueue,
    recentlyUnlocked,
    loadCuisineProgress,
    markCuisineTried,
    getCuisineProgress,
    calculateUserStats,
    checkForNewAchievements,
    updateFavoriteRestaurant,
    refreshData,
    // Enhanced functions
    getPredictedCuisines,
    getDiversityMetrics,
    getCuisineStats,
    // Achievement functions
    checkAchievements,
    unlockAchievement,
    getNextAchievements,
    clearRecentlyUnlocked,
    // Celebration functions
    getNextCelebration,
    dismissCelebration,
    clearCelebrationQueue,
  };
}