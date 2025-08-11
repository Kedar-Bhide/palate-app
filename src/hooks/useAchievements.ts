import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { Achievement, UserCuisineProgress, AchievementProgress } from '../types/cuisine';

// Define all available achievements
const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Explorer Achievements
  {
    id: 'first_taste',
    name: 'First Taste',
    description: 'Try your very first cuisine!',
    icon: '🎉',
    threshold: 1,
    tier: 'bronze',
    category: 'exploration',
    rarity: 'common',
    tips: ['Visit any restaurant and try a new cuisine', 'Start your culinary journey today!'],
  },
  {
    id: 'explorer_5',
    name: 'Curious Explorer',
    description: 'Try 5 different cuisines',
    icon: '🧭',
    threshold: 5,
    tier: 'bronze',
    category: 'exploration',
    rarity: 'common',
    tips: ['Try cuisines from different categories', 'Explore local restaurants in your area'],
  },
  {
    id: 'explorer_10',
    name: 'Food Adventurer',
    description: 'Try 10 different cuisines',
    icon: '🗺️',
    threshold: 10,
    tier: 'silver',
    category: 'exploration',
    rarity: 'common',
    tips: ['Visit food courts and try different vendors', 'Ask friends for restaurant recommendations'],
  },
  {
    id: 'explorer_25',
    name: 'Culinary Wanderer',
    description: 'Try 25 different cuisines',
    icon: '🌟',
    threshold: 25,
    tier: 'gold',
    category: 'exploration',
    rarity: 'rare',
    tips: ['Explore international districts in your city', 'Try fusion restaurants that combine multiple cuisines'],
  },
  {
    id: 'explorer_50',
    name: 'Master Explorer',
    description: 'Try 50 different cuisines',
    icon: '👑',
    threshold: 50,
    tier: 'gold',
    category: 'exploration',
    rarity: 'epic',
    tips: ['Travel to experience authentic regional cuisines', 'Attend food festivals and cultural events'],
  },
  {
    id: 'explorer_100',
    name: 'Global Gastronome',
    description: 'Try 100 different cuisines',
    icon: '🌍',
    threshold: 100,
    tier: 'platinum',
    category: 'exploration',
    rarity: 'legendary',
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
    category: 'diversity',
    rarity: 'rare',
    tips: ['Focus on Asian, European, African, American, and Oceanian cuisines', 'Explore ethnic restaurants in your area'],
  },
  {
    id: 'category_master',
    name: 'Category Master',
    description: 'Try at least 3 cuisines from every major category',
    icon: '🎯',
    threshold: 3,
    tier: 'gold',
    category: 'diversity',
    rarity: 'epic',
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
    category: 'specialist',
    rarity: 'rare',
    tips: ['Explore Chinese, Japanese, Korean, Thai, Indian, Vietnamese cuisines', 'Visit authentic Asian neighborhoods'],
  },
  {
    id: 'european_specialist',
    name: 'European Cuisine Specialist',
    description: 'Try 10 different European cuisines',
    icon: '🍝',
    threshold: 10,
    tier: 'gold',
    category: 'specialist',
    rarity: 'rare',
    tips: ['Try Italian, French, Spanish, German, Greek cuisines', 'Explore Mediterranean and Nordic options'],
  },

  // Streak Achievements
  {
    id: 'streak_7',
    name: 'Weekly Explorer',
    description: 'Try new cuisines 7 days in a row',
    icon: '🔥',
    threshold: 7,
    tier: 'silver',
    category: 'streak',
    rarity: 'rare',
    tips: ['Plan ahead with a list of restaurants to try', 'Mix simple and complex cuisines for sustainability'],
  },
  {
    id: 'streak_30',
    name: 'Monthly Maverick',
    description: 'Try new cuisines 30 days in a row',
    icon: '⚡',
    threshold: 30,
    tier: 'platinum',
    category: 'streak',
    rarity: 'legendary',
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
    category: 'social',
    rarity: 'common',
    tips: ['Share your cuisine discoveries with friends', 'Post photos and reviews of your favorite dishes'],
  },
  {
    id: 'taste_maker',
    name: 'Taste Maker',
    description: 'Share 20 cuisine experiences',
    icon: '🌟',
    threshold: 20,
    tier: 'gold',
    category: 'social',
    rarity: 'rare',
    tips: ['Build a following by sharing authentic food experiences', 'Help others discover new cuisines'],
  },
];

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserAchievements = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setUnlockedAchievements([]);
        return;
      }

      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const unlockedIds = data?.map(item => item.achievement_id) || [];
      setUnlockedAchievements(unlockedIds);
    } catch (err) {
      console.error('Error loading user achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    }
  }, []);

  const checkAchievements = useCallback((userProgress: UserCuisineProgress[]): Achievement[] => {
    const newAchievements: Achievement[] = [];
    const progressCount = userProgress.length;
    
    // Get cuisine data for more complex checks
    const cuisines = userProgress.map(p => p.cuisine).filter(Boolean);
    const categories = new Set(cuisines.map(c => c!.category));
    const countries = new Set(cuisines.map(c => c!.origin_country).filter(Boolean));

    ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
      if (unlockedAchievements.includes(achievement.id)) {
        return; // Already unlocked
      }

      let shouldUnlock = false;

      switch (achievement.id) {
        case 'first_taste':
        case 'explorer_5':
        case 'explorer_10':
        case 'explorer_25':
        case 'explorer_50':
        case 'explorer_100':
          shouldUnlock = progressCount >= achievement.threshold;
          break;

        case 'continental_5':
          shouldUnlock = countries.size >= achievement.threshold;
          break;

        case 'category_master':
          const categoryCounts: Record<string, number> = {};
          cuisines.forEach(cuisine => {
            if (cuisine?.category) {
              categoryCounts[cuisine.category] = (categoryCounts[cuisine.category] || 0) + 1;
            }
          });
          const qualifyingCategories = Object.values(categoryCounts).filter(count => count >= 3).length;
          shouldUnlock = qualifyingCategories >= 4; // At least 4 categories with 3+ cuisines each
          break;

        case 'asian_specialist':
          const asianCuisines = cuisines.filter(c => 
            c?.category?.toLowerCase().includes('asian') || 
            ['chinese', 'japanese', 'korean', 'thai', 'indian', 'vietnamese', 'filipino'].some(asian => 
              c?.name.toLowerCase().includes(asian)
            )
          );
          shouldUnlock = asianCuisines.length >= achievement.threshold;
          break;

        case 'european_specialist':
          const europeanCuisines = cuisines.filter(c => 
            c?.category?.toLowerCase().includes('european') || 
            ['italian', 'french', 'spanish', 'german', 'greek', 'british'].some(european => 
              c?.name.toLowerCase().includes(european)
            )
          );
          shouldUnlock = europeanCuisines.length >= achievement.threshold;
          break;

        case 'streak_7':
        case 'streak_30':
          // Calculate streak based on consecutive days
          const streak = calculateStreak(userProgress);
          shouldUnlock = streak >= achievement.threshold;
          break;

        default:
          // For social achievements and others, we'll implement when we have the data
          break;
      }

      if (shouldUnlock) {
        newAchievements.push({
          ...achievement,
          unlockedAt: new Date().toISOString(),
        });
      }
    });

    return newAchievements;
  }, [unlockedAchievements]);

  const unlockAchievement = useCallback(async (achievementId: string): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString(),
        });

      if (error) throw error;

      setUnlockedAchievements(prev => [...prev, achievementId]);
    } catch (err) {
      console.error('Error unlocking achievement:', err);
      throw err;
    }
  }, []);

  const getNextAchievements = useCallback((): Achievement[] => {
    return ACHIEVEMENT_DEFINITIONS
      .filter(achievement => !unlockedAchievements.includes(achievement.id))
      .sort((a, b) => a.threshold - b.threshold)
      .slice(0, 3);
  }, [unlockedAchievements]);

  const getAchievementProgress = useCallback((
    achievementId: string, 
    userProgress: UserCuisineProgress[]
  ): AchievementProgress => {
    const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    if (!achievement) {
      return { achievementId, progress: 0, total: 0, isUnlocked: false };
    }

    const isUnlocked = unlockedAchievements.includes(achievementId);
    let progress = 0;

    switch (achievementId) {
      case 'first_taste':
      case 'explorer_5':
      case 'explorer_10':
      case 'explorer_25':
      case 'explorer_50':
      case 'explorer_100':
        progress = userProgress.length;
        break;

      case 'continental_5':
        const countries = new Set(
          userProgress
            .map(p => p.cuisine?.origin_country)
            .filter(Boolean)
        );
        progress = countries.size;
        break;

      case 'streak_7':
      case 'streak_30':
        progress = calculateStreak(userProgress);
        break;

      default:
        progress = 0;
    }

    return {
      achievementId,
      progress: Math.min(progress, achievement.threshold),
      total: achievement.threshold,
      isUnlocked,
    };
  }, [unlockedAchievements]);

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

  // Calculate achievements based on current progress
  const achievementsWithProgress = useMemo(() => {
    return ACHIEVEMENT_DEFINITIONS.map(achievement => ({
      ...achievement,
      unlockedAt: unlockedAchievements.includes(achievement.id) ? 
        new Date().toISOString() : undefined,
    }));
  }, [unlockedAchievements]);

  useEffect(() => {
    const initializeAchievements = async () => {
      setLoading(true);
      try {
        await loadUserAchievements();
        setAchievements(ACHIEVEMENT_DEFINITIONS);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize achievements');
      } finally {
        setLoading(false);
      }
    };

    initializeAchievements();
  }, [loadUserAchievements]);

  return {
    achievements: achievementsWithProgress,
    unlockedAchievements,
    loading,
    error,
    checkAchievements,
    unlockAchievement,
    getNextAchievements,
    getAchievementProgress,
    shareAchievement,
    refreshAchievements: loadUserAchievements,
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