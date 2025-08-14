import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser } from '../lib/supabase';
import { 
  Achievement, 
  UserCuisineProgress, 
  AchievementProgress,
  Cuisine,
  AchievementType
} from '../types/cuisine';
import {
  getCuisinesByCategory,
  getEnhancedCuisineStreak,
  getEnhancedMonthlyProgress,
} from '../lib/cuisineUtils';

// Storage key for cached achievements
const ACHIEVEMENTS_STORAGE_KEY = '@achievements/unlocked';

// Enhanced achievement definitions with comprehensive criteria
const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Explorer Series - Try different cuisines
  {
    id: 'first_taste',
    name: 'First Taste',
    description: 'Embarked on your culinary journey!',
    icon: '🎉',
    threshold: 1,
    tier: 'bronze',
    type: 'milestone' as AchievementType,
    rarity: 'common',
    category: 'exploration',
    points: 50,
    tips: ['Visit any restaurant and try a new cuisine', 'Start your culinary journey today!'],
  },
  {
    id: 'explorer_5',
    name: 'Curious Explorer',
    description: 'Try 5 different cuisines',
    icon: '🧭',
    threshold: 5,
    tier: 'bronze',
    type: 'cuisine_count' as AchievementType,
    category: 'exploration',
    rarity: 'common',
    points: 100,
    tips: ['Try cuisines from different categories', 'Explore local restaurants in your area'],
  },
  {
    id: 'explorer_10',
    name: 'Food Adventurer',
    description: 'Try 10 different cuisines',
    icon: '🗺️',
    threshold: 10,
    tier: 'silver',
    type: 'cuisine_count' as AchievementType,
    category: 'exploration',
    rarity: 'common',
    points: 250,
    tips: ['Visit food courts and try different vendors', 'Ask friends for restaurant recommendations'],
  },
  {
    id: 'explorer_25',
    name: 'Culinary Wanderer',
    description: 'Try 25 different cuisines',
    icon: '🌟',
    threshold: 25,
    tier: 'gold',
    type: 'cuisine_count' as AchievementType,
    category: 'exploration',
    rarity: 'rare',
    points: 500,
    tips: ['Explore international districts in your city', 'Try fusion restaurants that combine multiple cuisines'],
  },
  {
    id: 'explorer_50',
    name: 'Master Explorer',
    description: 'Try 50 different cuisines',
    icon: '👑',
    threshold: 50,
    tier: 'gold',
    type: 'cuisine_count' as AchievementType,
    category: 'exploration',
    rarity: 'epic',
    points: 1000,
    tips: ['Travel to experience authentic regional cuisines', 'Attend food festivals and cultural events'],
  },
  {
    id: 'explorer_100',
    name: 'Global Gastronome',
    description: 'Try 100 different cuisines',
    icon: '🌍',
    threshold: 100,
    tier: 'platinum',
    type: 'cuisine_count' as AchievementType,
    category: 'exploration',
    rarity: 'legendary',
    points: 2500,
    tips: ['Become a true citizen of the world', 'Document your incredible culinary journey'],
  },

  // Diversity Achievements
  {
    id: 'continental_5',
    name: 'Continental Sampler',
    description: 'Try cuisines from 5 different continents',
    icon: '🌏',
    threshold: 5,
    tier: 'silver',
    type: 'country_diversity' as AchievementType,
    category: 'diversity',
    rarity: 'rare',
    points: 400,
    tips: ['Focus on Asian, European, African, American, and Oceanian cuisines', 'Explore ethnic restaurants in your area'],
  },
  {
    id: 'category_master',
    name: 'Category Master',
    description: 'Try at least 3 cuisines from every major category',
    icon: '🎯',
    threshold: 3,
    tier: 'gold',
    type: 'category_diversity' as AchievementType,
    category: 'diversity',
    rarity: 'epic',
    points: 800,
    tips: ['Balance between Asian, European, American, and African cuisines', 'Try both familiar and exotic options'],
  },

  // Specialist Achievements
  {
    id: 'asian_specialist',
    name: 'Asian Cuisine Specialist',
    description: 'Try 10 different Asian cuisines',
    icon: '🥢',
    threshold: 10,
    tier: 'gold',
    type: 'category_specialist' as AchievementType,
    category: 'specialist',
    rarity: 'rare',
    points: 600,
    metadata: { targetCategory: 'Asian' },
    tips: ['Explore Chinese, Japanese, Korean, Thai, Indian, Vietnamese cuisines', 'Visit authentic Asian neighborhoods'],
  },
  {
    id: 'european_specialist',
    name: 'European Cuisine Specialist',
    description: 'Try 10 different European cuisines',
    icon: '🍝',
    threshold: 10,
    tier: 'gold',
    type: 'category_specialist' as AchievementType,
    category: 'specialist',
    rarity: 'rare',
    points: 600,
    metadata: { targetCategory: 'European' },
    tips: ['Try Italian, French, Spanish, German, Greek cuisines', 'Explore Mediterranean and Nordic options'],
  },

  // Streak Achievements
  {
    id: 'streak_7',
    name: 'Weekly Explorer',
    description: 'Try new cuisines 7 consecutive weeks',
    icon: '🔥',
    threshold: 7,
    tier: 'silver',
    type: 'streak' as AchievementType,
    category: 'streak',
    rarity: 'rare',
    points: 500,
    tips: ['Plan ahead with a list of restaurants to try', 'Mix simple and complex cuisines for sustainability'],
  },
  {
    id: 'streak_30',
    name: 'Monthly Maverick',
    description: 'Maintain exploration streak for 30 weeks',
    icon: '⚡',
    threshold: 30,
    tier: 'platinum',
    type: 'streak' as AchievementType,
    category: 'streak',
    rarity: 'legendary',
    points: 1500,
    tips: ['This is an extreme challenge - plan carefully', 'Consider trying different dishes from the same cuisine'],
  },

  // Social Achievements
  {
    id: 'social_sharer',
    name: 'Cuisine Influencer',
    description: 'Share 5 cuisine experiences',
    icon: '📱',
    threshold: 5,
    tier: 'bronze',
    type: 'social_sharing' as AchievementType,
    category: 'social',
    rarity: 'common',
    points: 150,
    tips: ['Share your cuisine discoveries with friends', 'Post photos and reviews of your favorite dishes'],
  },
  {
    id: 'taste_maker',
    name: 'Taste Maker',
    description: 'Share 20 cuisine experiences',
    icon: '🌟',
    threshold: 20,
    tier: 'gold',
    type: 'social_sharing' as AchievementType,
    category: 'social',
    rarity: 'rare',
    points: 400,
    tips: ['Build a following by sharing authentic food experiences', 'Help others discover new cuisines'],
  },

  // Speed Challenge
  {
    id: 'speed_10_30',
    name: 'Speed Explorer',
    description: 'Try 10 cuisines in 30 days',
    icon: '⚡',
    threshold: 10,
    tier: 'gold',
    type: 'speed_challenge' as AchievementType,
    category: 'challenge',
    rarity: 'epic',
    points: 750,
    tips: ['Plan your culinary sprint wisely', 'Balance variety with accessibility'],
  },
];

export interface UseAchievementsReturn {
  achievements: Achievement[];
  unlockedAchievements: Set<string>;
  recentlyUnlocked: Achievement[];
  loading: boolean;
  error: string | null;
  totalPoints: number;
  // Functions
  checkAchievements: (userProgress: UserCuisineProgress[], allCuisines?: Cuisine[]) => Achievement[];
  unlockAchievement: (achievementId: string) => Promise<void>;
  getNextAchievements: (userProgress: UserCuisineProgress[], allCuisines?: Cuisine[]) => Achievement[];
  getAchievementProgress: (achievementId: string, userProgress?: UserCuisineProgress[], allCuisines?: Cuisine[]) => AchievementProgress;
  celebrateAchievement: (achievement: Achievement) => void;
  clearRecentlyUnlocked: () => void;
  syncAchievements: () => Promise<void>;
  getAchievementsByCategory: (category: string) => Achievement[];
  getUserStats: () => { totalUnlocked: number; totalPoints: number; highestTier: string };
  shareAchievement: (achievement: Achievement) => Promise<void>;
  refreshAchievements: () => Promise<void>;
}

export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  
  const celebrationCallbacks = useRef<((achievement: Achievement) => void)[]>([]);

  // Load unlocked achievements from storage on init
  useEffect(() => {
    loadUnlockedAchievements();
  }, []);

  // Calculate total points when unlocked achievements change
  useEffect(() => {
    const points = achievements
      .filter(achievement => unlockedAchievements.has(achievement.id))
      .reduce((sum, achievement) => sum + (achievement.points || 0), 0);
    setTotalPoints(points);
  }, [unlockedAchievements, achievements]);

  const loadUnlockedAchievements = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try to load from Supabase first
      const user = await getCurrentUser();
      if (user) {
        const { data: userAchievements, error: dbError } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);

        if (dbError) {
          console.warn('Error loading achievements from database:', dbError);
          // Fallback to local storage
          await loadFromLocalStorage();
        } else {
          const unlockedIds = new Set<string>(userAchievements?.map(ua => ua.achievement_id) || []);
          setUnlockedAchievements(unlockedIds);
          
          // Also save to local storage as backup
          await AsyncStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(Array.from(unlockedIds)));
        }
      } else {
        await loadFromLocalStorage();
      }
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
      await loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFromLocalStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (stored) {
        const unlockedIds = new Set(JSON.parse(stored));
        setUnlockedAchievements(unlockedIds);
      }
    } catch (err) {
      console.error('Error loading from local storage:', err);
    }
  }, []);

  const checkAchievements = useCallback((
    userProgress: UserCuisineProgress[], 
    allCuisines: Cuisine[] = []
  ): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];

    achievements.forEach(achievement => {
      if (unlockedAchievements.has(achievement.id)) {
        return; // Already unlocked
      }

      const progress = getAchievementProgress(achievement.id, userProgress, allCuisines);
      
      if (progress.isUnlocked) {
        newlyUnlocked.push(achievement);
      }
    });

    return newlyUnlocked;
  }, [achievements, unlockedAchievements]);

  const unlockAchievement = useCallback(async (achievementId: string) => {
    try {
      if (unlockedAchievements.has(achievementId)) {
        return; // Already unlocked
      }

      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement) {
        console.warn(`Achievement ${achievementId} not found`);
        return;
      }

      // Update local state
      setUnlockedAchievements(prev => new Set([...prev, achievementId]));
      setRecentlyUnlocked(prev => [...prev, achievement]);

      // Trigger celebration
      celebrateAchievement(achievement);

      // Save to database
      const user = await getCurrentUser();
      if (user) {
        const { error: dbError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievementId,
            achievement_name: achievement.name,
            achievement_description: achievement.description,
            achievement_icon: achievement.icon,
            threshold_value: achievement.threshold,
            unlocked_at: new Date().toISOString(),
          });

        if (dbError) {
          console.error('Error saving achievement to database:', dbError);
        }
      }

      // Save to local storage as backup
      const updatedUnlocked = new Set<string>([...Array.from(unlockedAchievements), achievementId]);
      await AsyncStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(Array.from(updatedUnlocked)));

    } catch (err) {
      console.error('Error unlocking achievement:', err);
      setError(err instanceof Error ? err.message : 'Failed to unlock achievement');
    }
  }, [achievements, unlockedAchievements]);

  const getNextAchievements = useCallback((
    userProgress: UserCuisineProgress[], 
    allCuisines: Cuisine[] = []
  ): Achievement[] => {
    return achievements
      .filter(achievement => !unlockedAchievements.has(achievement.id))
      .map(achievement => ({
        ...achievement,
        progress: getAchievementProgress(achievement.id, userProgress, allCuisines).progress,
      }))
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 5); // Return top 5 closest achievements
  }, [achievements, unlockedAchievements]);

  const getAchievementProgress = useCallback((
    achievementId: string, 
    userProgress: UserCuisineProgress[] = [],
    allCuisines: Cuisine[] = []
  ): AchievementProgress => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) {
      return { progress: 0, isUnlocked: false, current: 0, target: 0 };
    }

    const isUnlocked = unlockedAchievements.has(achievementId);
    if (isUnlocked) {
      return { progress: 1, isUnlocked: true, current: achievement.threshold, target: achievement.threshold };
    }

    let current = 0;
    const target = achievement.threshold;

    // Use enhanced logic based on achievement category
    switch (achievement.category) {
      case 'exploration':
        current = userProgress.length;
        break;

      case 'diversity':
        if (achievementId === 'continental_5') {
          const countries = new Set(
            userProgress
              .map(p => p.cuisine?.origin_country)
              .filter(Boolean)
          );
          current = countries.size;
        }
        break;

      case 'specialist':
        if (achievementId.includes('asian')) {
          current = userProgress.filter(p => 
            p.cuisine?.category?.toLowerCase()?.includes('asian') || false
          ).length;
        } else if (achievementId.includes('european')) {
          current = userProgress.filter(p => 
            p.cuisine?.category?.toLowerCase()?.includes('european') || false
          ).length;
        }
        break;

      case 'streak':
        current = getEnhancedCuisineStreak(userProgress);
        break;

      case 'social':
        // Count progress with photos as "shared"
        current = userProgress.filter(p => p.photos && p.photos.length > 0).length;
        break;

      default:
        current = userProgress.length;
    }

    const progress = target > 0 ? Math.min(current / target, 1) : 0;
    const isComplete = current >= target;

    return {
      progress,
      isUnlocked: isComplete,
      current: Math.min(current, target),
      target,
    };
  }, [achievements, unlockedAchievements]);

  const celebrateAchievement = useCallback((achievement: Achievement) => {
    celebrationCallbacks.current.forEach(callback => callback(achievement));
  }, []);

  const clearRecentlyUnlocked = useCallback(() => {
    setRecentlyUnlocked([]);
  }, []);

  const syncAchievements = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Fetch latest from database
      const { data: dbAchievements, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error syncing achievements:', error);
        return;
      }

      const dbUnlockedIds = new Set<string>(dbAchievements?.map(ua => ua.achievement_id) || []);
      setUnlockedAchievements(dbUnlockedIds);

      // Update local storage
      await AsyncStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(Array.from(dbUnlockedIds)));
    } catch (err) {
      console.error('Error syncing achievements:', err);
    }
  }, []);

  const getAchievementsByCategory = useCallback((category: string): Achievement[] => {
    return achievements.filter(achievement => achievement.category === category);
  }, [achievements]);

  const getUserStats = useCallback(() => {
    const unlockedList = achievements.filter(a => unlockedAchievements.has(a.id));
    const totalUnlocked = unlockedList.length;
    const highestTierMap = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    const highestTierValue = Math.max(...unlockedList.map(a => highestTierMap[a.tier || 'bronze'] || 1));
    const highestTier = Object.keys(highestTierMap).find(key => 
      highestTierMap[key as keyof typeof highestTierMap] === highestTierValue
    ) || 'bronze';

    return {
      totalUnlocked,
      totalPoints,
      highestTier,
    };
  }, [achievements, unlockedAchievements, totalPoints]);

  const shareAchievement = useCallback(async (achievement: Achievement): Promise<void> => {
    try {
      // This would integrate with social sharing APIs
      // For now, we'll just log it
      console.log('Sharing achievement:', achievement.name);
      
      // You could integrate with native sharing here
      // or post to social media APIs
    } catch (err) {
      console.error('Error sharing achievement:', err);
      throw err;
    }
  }, []);

  // Initialize achievements
  useEffect(() => {
    setAchievements(ACHIEVEMENT_DEFINITIONS);
  }, []);

  return {
    achievements,
    unlockedAchievements,
    recentlyUnlocked,
    loading,
    error,
    totalPoints,
    checkAchievements,
    unlockAchievement,
    getNextAchievements,
    getAchievementProgress,
    celebrateAchievement,
    clearRecentlyUnlocked,
    syncAchievements,
    getAchievementsByCategory,
    getUserStats,
    shareAchievement,
    refreshAchievements: loadUnlockedAchievements,
  };
}

function calculateStreak(userProgress: UserCuisineProgress[]): number {
  if (userProgress.length === 0) return 0;

  const sortedProgress = [...userProgress].sort(
    (a, b) => new Date(b.first_tried_at).getTime() - new Date(a.first_tried_at).getTime()
  );

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const progress of sortedProgress) {
    const tryDate = new Date(progress.first_tried_at);
    tryDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((currentDate.getTime() - tryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= streak) {
      streak++;
      currentDate = tryDate;
    } else if (daysDiff === streak + 1) {
      streak++;
      currentDate = tryDate;
    } else {
      break;
    }
  }

  return streak;
}