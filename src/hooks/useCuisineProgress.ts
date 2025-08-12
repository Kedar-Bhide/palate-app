import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import {
  Cuisine,
  UserCuisineProgress,
  ProgressStats,
  Achievement
} from '../types/cuisine';
import {
  calculateProgress,
  detectNewAchievements,
  getProgressGoals
} from '../lib/cuisineUtils';

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
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const loadCuisines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cuisines')
        .select('*')
        .order('name');

      if (error) throw error;
      setCuisines(data || []);
      return data || [];
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

      const { data, error } = await supabase
        .from('user_cuisine_progress')
        .select(`
          *,
          cuisine:cuisines(*)
        `)
        .eq('user_id', user.id)
        .order('first_tried_at', { ascending: false });

      if (error) throw error;
      
      const progressData = data || [];
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

      const newStats = calculateProgress(progressData, cuisinesData);
      setStats(newStats);

      // Load achievements
      const goals = getProgressGoals(newStats.triedCuisines);
      const unlockedAchievements = goals
        .filter(goal => goal.achieved)
        .map(goal => ({
          id: `cuisine_${goal.threshold}`,
          name: goal.name,
          description: goal.description,
          icon: goal.icon,
          threshold: goal.threshold
        }));
      setAchievements(unlockedAchievements);

    } catch (err) {
      console.error('Error loading cuisine progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadCuisines, loadUserProgress]);

  const markCuisineTried = useCallback(async (cuisineId: number, restaurantName: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if already tried
      const existingProgress = userProgress.find(p => p.cuisine_id === cuisineId);
      if (existingProgress) {
        // Update existing progress
        const { error } = await supabase
          .from('user_cuisine_progress')
          .update({
            times_tried: existingProgress.times_tried + 1,
            favorite_restaurant: restaurantName
          })
          .eq('id', existingProgress.id);

        if (error) throw error;

        // Update local state
        setUserProgress(prev => prev.map(p => 
          p.id === existingProgress.id 
            ? { ...p, times_tried: p.times_tried + 1, favorite_restaurant: restaurantName }
            : p
        ));
      } else {
        // Create new progress entry
        const { data, error } = await supabase
          .from('user_cuisine_progress')
          .insert({
            user_id: user.id,
            cuisine_id: cuisineId,
            first_tried_at: new Date().toISOString(),
            times_tried: 1,
            favorite_restaurant: restaurantName
          })
          .select(`
            *,
            cuisine:cuisines(*)
          `)
          .single();

        if (error) throw error;

        // Update local state
        const newProgress = [...userProgress, data];
        setUserProgress(newProgress);


        // Check for new achievements
        const oldTriedCount = userProgress.length;
        const newTriedCount = newProgress.length;
        const newAchievements = detectNewAchievements(oldTriedCount, newTriedCount);
        
        if (newAchievements.length > 0) {
          setAchievements(prev => [...prev, ...newAchievements]);
        }

        // Update stats
        const newStats = calculateProgress(newProgress, cuisines);
        setStats(newStats);
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

      const { error } = await supabase
        .from('user_cuisine_progress')
        .update({ favorite_restaurant: restaurantName })
        .eq('id', progressItem.id);

      if (error) throw error;

      // Update local state
      setUserProgress(prev => prev.map(p => 
        p.id === progressItem.id 
          ? { ...p, favorite_restaurant: restaurantName }
          : p
      ));
    } catch (err) {
      console.error('Error updating favorite restaurant:', err);
      throw err;
    }
  }, [userProgress]);

  const getCuisineProgress = useCallback((cuisineId: number): UserCuisineProgress | null => {
    return userProgress.find(p => p.cuisine_id === cuisineId) || null;
  }, [userProgress]);

  const calculateUserStats = useCallback((): ProgressStats => {
    return calculateProgress(userProgress, cuisines);
  }, [userProgress, cuisines]);

  const checkForNewAchievements = useCallback((): Achievement[] => {
    const currentProgress = userProgress.length;
    const goals = getProgressGoals(currentProgress);
    
    return goals
      .filter(goal => goal.achieved)
      .map(goal => ({
        id: `cuisine_${goal.threshold}`,
        name: goal.name,
        description: goal.description,
        icon: goal.icon,
        threshold: goal.threshold
      }))
      .filter(achievement => 
        !achievements.some(existing => existing.id === achievement.id)
      );
  }, [userProgress, achievements]);

  const refreshData = useCallback(() => {
    loadCuisineProgress();
  }, [loadCuisineProgress]);


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
    loadCuisineProgress,
    markCuisineTried,
    getCuisineProgress,
    calculateUserStats,
    checkForNewAchievements,
    updateFavoriteRestaurant,
    refreshData,
  };
}