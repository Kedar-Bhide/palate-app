import {
  Cuisine,
  UserCuisineProgress,
  ProgressStats,
  Achievement,
  CuisineCategory,
  ProgressGoal,
  CuisineStreak,
  MonthlyProgress,
  DiversityMetrics
} from '../types/cuisine';

// Define achievement thresholds and goals
export const CUISINE_GOALS: ProgressGoal[] = [
  { threshold: 5, name: 'Explorer', description: 'Try 5 different cuisines', icon: '🌟', achieved: false },
  { threshold: 10, name: 'Adventurer', description: 'Try 10 different cuisines', icon: '🏆', achieved: false },
  { threshold: 20, name: 'Foodie', description: 'Try 20 different cuisines', icon: '🎖️', achieved: false },
  { threshold: 50, name: 'Connoisseur', description: 'Try 50 different cuisines', icon: '👑', achieved: false },
  { threshold: 100, name: 'Global Palate', description: 'Try 100 different cuisines', icon: '🌍', achieved: false }
];

export function calculateProgress(userProgress: UserCuisineProgress[], allCuisines: Cuisine[]): ProgressStats {
  const triedCuisines = userProgress.length;
  const totalCuisines = allCuisines.length;
  const percentage = totalCuisines > 0 ? Math.round((triedCuisines / totalCuisines) * 100) : 0;
  
  const diversityScore = calculateDiversityScore(userProgress, allCuisines);
  const currentStreak = getCuisineStreak(userProgress);
  const monthlyProgress = getMonthlyProgress(userProgress);
  const nextGoal = getNextGoal(triedCuisines);

  return {
    totalCuisines,
    triedCuisines,
    percentage,
    diversityScore,
    currentStreak,
    monthlyProgress,
    nextGoal
  };
}

export function detectNewAchievements(oldProgress: number, newProgress: number): Achievement[] {
  const achievements: Achievement[] = [];
  
  CUISINE_GOALS.forEach(goal => {
    if (oldProgress < goal.threshold && newProgress >= goal.threshold) {
      achievements.push({
        id: `cuisine_${goal.threshold}`,
        name: goal.name,
        description: goal.description,
        icon: goal.icon,
        threshold: goal.threshold,
        unlockedAt: new Date().toISOString()
      });
    }
  });

  // Special achievements
  if (newProgress === 1 && oldProgress === 0) {
    achievements.push({
      id: 'first_cuisine',
      name: 'First Taste',
      description: 'Tried your first cuisine!',
      icon: '🎉',
      threshold: 1,
      unlockedAt: new Date().toISOString()
    });
  }

  return achievements;
}

export function getCuisinesByCategory(cuisines: Cuisine[], userProgress: UserCuisineProgress[]): CuisineCategory[] {
  const categoryMap = new Map<string, { cuisines: Cuisine[], triedCount: number }>();

  cuisines.forEach(cuisine => {
    if (!categoryMap.has(cuisine.category)) {
      categoryMap.set(cuisine.category, { cuisines: [], triedCount: 0 });
    }
    
    const category = categoryMap.get(cuisine.category)!;
    category.cuisines.push(cuisine);
    
    if (userProgress.some(progress => progress.cuisine_id === cuisine.id)) {
      category.triedCount++;
    }
  });

  return Array.from(categoryMap.entries()).map(([name, data]) => ({
    name,
    cuisines: data.cuisines.sort((a, b) => a.name.localeCompare(b.name)),
    triedCount: data.triedCount
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export function calculateDiversityScore(userProgress: UserCuisineProgress[], allCuisines: Cuisine[]): number {
  if (userProgress.length === 0) return 0;

  const triedCuisineIds = new Set(userProgress.map(p => p.cuisine_id));
  const triedCuisines = allCuisines.filter(c => triedCuisineIds.has(c.id));
  
  const categoriesWithCuisines = getCuisinesByCategory(allCuisines, userProgress);
  const totalCategories = categoriesWithCuisines.length;
  const triedCategories = categoriesWithCuisines.filter(cat => cat.triedCount > 0).length;
  
  const categoryDiversity = totalCategories > 0 ? (triedCategories / totalCategories) : 0;
  const cuisineProgress = allCuisines.length > 0 ? (triedCuisines.length / allCuisines.length) : 0;
  
  // Weighted score: 60% category diversity + 40% overall progress
  return Math.round((categoryDiversity * 0.6 + cuisineProgress * 0.4) * 100);
}

export function getNextGoal(currentProgress: number): { goal: number; remaining: number } {
  const nextGoal = CUISINE_GOALS.find(goal => goal.threshold > currentProgress);
  
  if (nextGoal) {
    return {
      goal: nextGoal.threshold,
      remaining: nextGoal.threshold - currentProgress
    };
  }
  
  // If all goals are achieved, suggest the next milestone
  const nextMilestone = Math.ceil(currentProgress / 25) * 25 + 25;
  return {
    goal: nextMilestone,
    remaining: nextMilestone - currentProgress
  };
}

export function formatProgressText(tried: number, total: number): string {
  if (total === 0) return 'No cuisines available';
  
  const percentage = Math.round((tried / total) * 100);
  return `${tried} of ${total} cuisines explored (${percentage}%)`;
}

export function getCuisineStreak(userProgress: UserCuisineProgress[]): number {
  if (userProgress.length === 0) return 0;

  const sortedProgress = [...userProgress].sort(
    (a, b) => new Date(b.first_tried_at).getTime() - new Date(a.first_tried_at).getTime()
  );

  let currentStreak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const progress of sortedProgress) {
    const tryDate = new Date(progress.first_tried_at);
    tryDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((currentDate.getTime() - tryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= currentStreak + 7) { // Allow up to 7 days gap
      currentStreak++;
    } else {
      break;
    }
  }

  return currentStreak;
}

export function getMonthlyProgress(userProgress: UserCuisineProgress[]): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return userProgress.filter(progress => {
    const progressDate = new Date(progress.first_tried_at);
    return progressDate.getMonth() === currentMonth && 
           progressDate.getFullYear() === currentYear;
  }).length;
}

export function getProgressGoals(currentProgress: number): ProgressGoal[] {
  return CUISINE_GOALS.map(goal => ({
    ...goal,
    achieved: currentProgress >= goal.threshold
  }));
}

export function searchCuisines(cuisines: Cuisine[], query: string): Cuisine[] {
  if (!query.trim()) return cuisines;

  const searchTerm = query.toLowerCase().trim();
  return cuisines.filter(cuisine => 
    cuisine.name.toLowerCase().includes(searchTerm) ||
    cuisine.category.toLowerCase().includes(searchTerm) ||
    cuisine.origin_country?.toLowerCase().includes(searchTerm) ||
    cuisine.description?.toLowerCase().includes(searchTerm)
  );
}

export function filterCuisines(
  cuisines: Cuisine[], 
  userProgress: UserCuisineProgress[], 
  filter: 'all' | 'tried' | 'untried'
): Cuisine[] {
  if (filter === 'all') return cuisines;

  const triedCuisineIds = new Set(userProgress.map(p => p.cuisine_id));

  if (filter === 'tried') {
    return cuisines.filter(cuisine => triedCuisineIds.has(cuisine.id));
  }

  if (filter === 'untried') {
    return cuisines.filter(cuisine => !triedCuisineIds.has(cuisine.id));
  }

  return cuisines;
}

export function getDiversityMetrics(userProgress: UserCuisineProgress[], allCuisines: Cuisine[]): DiversityMetrics {
  const categoriesWithCuisines = getCuisinesByCategory(allCuisines, userProgress);
  const totalCategories = categoriesWithCuisines.length;
  const triedCategories = categoriesWithCuisines.filter(cat => cat.triedCount > 0).length;
  
  const categoryCoverage: Record<string, number> = {};
  categoriesWithCuisines.forEach(category => {
    const coverage = category.cuisines.length > 0 ? 
      (category.triedCount / category.cuisines.length) * 100 : 0;
    categoryCoverage[category.name] = Math.round(coverage);
  });

  const score = calculateDiversityScore(userProgress, allCuisines);

  return {
    score,
    categoryCoverage,
    totalCategories,
    triedCategories
  };
}

export function getRecentActivity(userProgress: UserCuisineProgress[], limit: number = 5): UserCuisineProgress[] {
  return [...userProgress]
    .sort((a, b) => new Date(b.first_tried_at).getTime() - new Date(a.first_tried_at).getTime())
    .slice(0, limit);
}

// =============================================================================
// ENHANCED PROGRESS CALCULATIONS
// =============================================================================

/**
 * Enhanced diversity score with weighted category importance
 */
export function calculateEnhancedDiversityScore(
  userProgress: UserCuisineProgress[], 
  allCuisines: Cuisine[]
): number {
  if (userProgress.length === 0) return 0;

  const triedCuisineIds = new Set(userProgress.map(p => p.cuisine_id));
  const triedCuisines = allCuisines.filter(c => triedCuisineIds.has(c.id));
  
  const categoriesWithCuisines = getCuisinesByCategory(allCuisines, userProgress);
  const totalCategories = categoriesWithCuisines.length;
  const triedCategories = categoriesWithCuisines.filter(cat => cat.triedCount > 0).length;
  
  // Category diversity (40% weight)
  const categoryDiversity = totalCategories > 0 ? (triedCategories / totalCategories) : 0;
  
  // Overall progress (30% weight)
  const cuisineProgress = allCuisines.length > 0 ? (triedCuisines.length / allCuisines.length) : 0;
  
  // Category depth bonus (20% weight) - reward trying multiple cuisines per category
  let depthBonus = 0;
  categoriesWithCuisines.forEach(category => {
    if (category.triedCount > 0) {
      const categoryDepth = Math.min(category.triedCount / category.cuisines.length, 1);
      depthBonus += categoryDepth;
    }
  });
  depthBonus = totalCategories > 0 ? depthBonus / totalCategories : 0;
  
  // Consistency bonus (10% weight) - reward regular exploration
  const consistencyBonus = calculateConsistencyBonus(userProgress);
  
  // Weighted final score
  const finalScore = (
    categoryDiversity * 0.4 +
    cuisineProgress * 0.3 +
    depthBonus * 0.2 +
    consistencyBonus * 0.1
  );
  
  return Math.round(finalScore * 100);
}

/**
 * Calculate consistency bonus based on exploration patterns
 */
function calculateConsistencyBonus(userProgress: UserCuisineProgress[]): number {
  if (userProgress.length < 2) return 0;

  const sortedProgress = [...userProgress].sort(
    (a, b) => new Date(a.first_tried_at).getTime() - new Date(b.first_tried_at).getTime()
  );

  let consistencyScore = 0;
  let streakCount = 0;
  const maxGapDays = 30; // Maximum days between tries for consistency

  for (let i = 1; i < sortedProgress.length; i++) {
    const prevDate = new Date(sortedProgress[i - 1].first_tried_at);
    const currentDate = new Date(sortedProgress[i].first_tried_at);
    const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= maxGapDays) {
      streakCount++;
    } else {
      streakCount = 0;
    }

    consistencyScore += streakCount;
  }

  // Normalize based on total progress
  return Math.min(consistencyScore / (userProgress.length * 2), 1);
}

/**
 * Enhanced achievement detection with more sophisticated logic
 */
export function detectEnhancedAchievements(
  oldProgress: UserCuisineProgress[], 
  newProgress: UserCuisineProgress[],
  allCuisines: Cuisine[]
): Achievement[] {
  const achievements: Achievement[] = [];
  const oldCount = oldProgress.length;
  const newCount = newProgress.length;

  // Standard milestone achievements
  CUISINE_GOALS.forEach(goal => {
    if (oldCount < goal.threshold && newCount >= goal.threshold) {
      achievements.push({
        id: `cuisine_${goal.threshold}`,
        name: goal.name,
        description: goal.description,
        icon: goal.icon,
        threshold: goal.threshold,
        unlockedAt: new Date().toISOString()
      });
    }
  });

  // Category-based achievements
  const categoryAchievements = detectCategoryAchievements(oldProgress, newProgress, allCuisines);
  achievements.push(...categoryAchievements);

  // Streak achievements
  const streakAchievements = detectStreakAchievements(newProgress);
  achievements.push(...streakAchievements);

  // Speed achievements
  const speedAchievements = detectSpeedAchievements(oldProgress, newProgress);
  achievements.push(...speedAchievements);

  return achievements;
}

/**
 * Detect category-specific achievements
 */
function detectCategoryAchievements(
  oldProgress: UserCuisineProgress[],
  newProgress: UserCuisineProgress[],
  allCuisines: Cuisine[]
): Achievement[] {
  const achievements: Achievement[] = [];
  
  const oldCategories = getCuisinesByCategory(allCuisines, oldProgress);
  const newCategories = getCuisinesByCategory(allCuisines, newProgress);

  newCategories.forEach(newCat => {
    const oldCat = oldCategories.find(c => c.name === newCat.name);
    const oldCount = oldCat?.triedCount || 0;
    const newCount = newCat.triedCount;

    // First in category
    if (oldCount === 0 && newCount === 1) {
      achievements.push({
        id: `category_first_${newCat.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: `${newCat.name} Explorer`,
        description: `First taste of ${newCat.name} cuisine!`,
        icon: '🌟',
        threshold: 1,
        unlockedAt: new Date().toISOString()
      });
    }

    // Category completion milestones
    const completionPercentage = (newCount / newCat.cuisines.length) * 100;
    if (completionPercentage >= 50 && (oldCount / newCat.cuisines.length) * 100 < 50) {
      achievements.push({
        id: `category_half_${newCat.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: `${newCat.name} Enthusiast`,
        description: `Tried half of all ${newCat.name} cuisines!`,
        icon: '🏅',
        threshold: Math.ceil(newCat.cuisines.length / 2),
        unlockedAt: new Date().toISOString()
      });
    }

    if (completionPercentage === 100 && (oldCount / newCat.cuisines.length) * 100 < 100) {
      achievements.push({
        id: `category_complete_${newCat.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: `${newCat.name} Master`,
        description: `Mastered all ${newCat.name} cuisines!`,
        icon: '👑',
        threshold: newCat.cuisines.length,
        unlockedAt: new Date().toISOString()
      });
    }
  });

  return achievements;
}

/**
 * Detect streak-based achievements
 */
function detectStreakAchievements(userProgress: UserCuisineProgress[]): Achievement[] {
  const achievements: Achievement[] = [];
  const currentStreak = getEnhancedCuisineStreak(userProgress);

  const streakMilestones = [
    { threshold: 7, name: 'Week Warrior', description: 'Tried cuisines for 7 consecutive weeks!', icon: '🔥' },
    { threshold: 30, name: 'Monthly Master', description: 'Maintained exploration for a month!', icon: '💪' },
    { threshold: 90, name: 'Quarterly Champion', description: '3 months of continuous exploration!', icon: '🏆' },
    { threshold: 365, name: 'Year-Long Explorer', description: 'A full year of culinary adventures!', icon: '🌟' },
  ];

  streakMilestones.forEach(milestone => {
    if (currentStreak >= milestone.threshold) {
      achievements.push({
        id: `streak_${milestone.threshold}`,
        name: milestone.name,
        description: milestone.description,
        icon: milestone.icon,
        threshold: milestone.threshold,
        unlockedAt: new Date().toISOString()
      });
    }
  });

  return achievements;
}

/**
 * Detect speed-based achievements
 */
function detectSpeedAchievements(
  oldProgress: UserCuisineProgress[],
  newProgress: UserCuisineProgress[]
): Achievement[] {
  const achievements: Achievement[] = [];
  
  if (newProgress.length <= oldProgress.length) return achievements;

  const latestProgress = newProgress[newProgress.length - 1];
  const firstProgress = newProgress[0];
  
  if (!firstProgress || !latestProgress) return achievements;

  const daysSinceStart = Math.floor(
    (new Date(latestProgress.first_tried_at).getTime() - new Date(firstProgress.first_tried_at).getTime()) 
    / (1000 * 60 * 60 * 24)
  );

  // Speed milestones
  if (newProgress.length >= 10 && daysSinceStart <= 30) {
    achievements.push({
      id: 'speed_10_30',
      name: 'Speed Explorer',
      description: '10 cuisines in 30 days!',
      icon: '⚡',
      threshold: 10,
      unlockedAt: new Date().toISOString()
    });
  }

  if (newProgress.length >= 20 && daysSinceStart <= 60) {
    achievements.push({
      id: 'speed_20_60',
      name: 'Rapid Discoverer',
      description: '20 cuisines in 2 months!',
      icon: '🚀',
      threshold: 20,
      unlockedAt: new Date().toISOString()
    });
  }

  return achievements;
}

/**
 * Enhanced cuisine streak calculation with weekly granularity
 */
export function getEnhancedCuisineStreak(userProgress: UserCuisineProgress[]): number {
  if (userProgress.length === 0) return 0;

  const sortedProgress = [...userProgress].sort(
    (a, b) => new Date(b.first_tried_at).getTime() - new Date(a.first_tried_at).getTime()
  );

  let currentStreak = 0;
  let lastWeek = getWeekNumber(new Date());
  let lastYear = new Date().getFullYear();

  // Check current week first
  const thisWeek = getWeekNumber(new Date());
  const thisYear = new Date().getFullYear();
  const hasTriedThisWeek = sortedProgress.some(progress => {
    const progressDate = new Date(progress.first_tried_at);
    return getWeekNumber(progressDate) === thisWeek && progressDate.getFullYear() === thisYear;
  });

  if (!hasTriedThisWeek) {
    lastWeek = thisWeek - 1;
    if (lastWeek < 1) {
      lastWeek = 52;
      lastYear = thisYear - 1;
    }
  }

  // Count consecutive weeks with cuisine tries
  for (const progress of sortedProgress) {
    const progressDate = new Date(progress.first_tried_at);
    const progressWeek = getWeekNumber(progressDate);
    const progressYear = progressDate.getFullYear();

    if (progressYear === lastYear && progressWeek === lastWeek) {
      currentStreak++;
      lastWeek--;
      if (lastWeek < 1) {
        lastWeek = 52;
        lastYear--;
      }
    } else if (progressYear < lastYear || (progressYear === lastYear && progressWeek < lastWeek)) {
      break; // Gap found, streak ends
    }
  }

  return currentStreak;
}

/**
 * Get week number of the year
 */
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

/**
 * Enhanced monthly progress with trend analysis
 */
export function getEnhancedMonthlyProgress(userProgress: UserCuisineProgress[]): {
  thisMonth: number;
  lastMonth: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  weeklyBreakdown: number[];
} {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthProgress = userProgress.filter(progress => {
    const progressDate = new Date(progress.first_tried_at);
    return progressDate.getMonth() === currentMonth && 
           progressDate.getFullYear() === currentYear;
  });

  const lastMonthProgress = userProgress.filter(progress => {
    const progressDate = new Date(progress.first_tried_at);
    return progressDate.getMonth() === lastMonth && 
           progressDate.getFullYear() === lastMonthYear;
  });

  // Weekly breakdown for current month
  const weeklyBreakdown = [0, 0, 0, 0]; // 4 weeks
  thisMonthProgress.forEach(progress => {
    const progressDate = new Date(progress.first_tried_at);
    const weekOfMonth = Math.floor((progressDate.getDate() - 1) / 7);
    if (weekOfMonth < 4) {
      weeklyBreakdown[weekOfMonth]++;
    }
  });

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (thisMonthProgress.length > lastMonthProgress.length) {
    trend = 'increasing';
  } else if (thisMonthProgress.length < lastMonthProgress.length) {
    trend = 'decreasing';
  }

  return {
    thisMonth: thisMonthProgress.length,
    lastMonth: lastMonthProgress.length,
    trend,
    weeklyBreakdown,
  };
}

/**
 * Predict next cuisines based on user preferences and exploration patterns
 */
export function predictNextCuisines(
  userProgress: UserCuisineProgress[], 
  allCuisines: Cuisine[],
  limit: number = 5
): Cuisine[] {
  const triedCuisineIds = new Set(userProgress.map(p => p.cuisine_id));
  const untriedCuisines = allCuisines.filter(c => !triedCuisineIds.has(c.id));

  if (untriedCuisines.length === 0) return [];

  // Analyze user preferences
  const categoryPreferences = analyzeUserCategoryPreferences(userProgress, allCuisines);
  const ratingPreferences = analyzeUserRatingPatterns(userProgress);
  const recentPatterns = analyzeRecentExplorationPatterns(userProgress);

  // Score each untried cuisine
  const scoredCuisines = untriedCuisines.map(cuisine => {
    let score = 0;

    // Category preference score (40% weight)
    const categoryScore = categoryPreferences[cuisine.category] || 0;
    score += categoryScore * 0.4;

    // Diversity bonus (30% weight) - favor categories with fewer tries
    const categoryCount = userProgress.filter(p => 
      p.cuisine?.category === cuisine.category
    ).length;
    const diversityScore = categoryCount === 0 ? 1 : 1 / (categoryCount + 1);
    score += diversityScore * 0.3;

    // Origin country pattern (20% weight)
    if (cuisine.origin_country && recentPatterns.countries[cuisine.origin_country]) {
      score += recentPatterns.countries[cuisine.origin_country] * 0.2;
    }

    // Randomness factor (10% weight) for discovery
    score += Math.random() * 0.1;

    return { cuisine, score };
  });

  // Sort by score and return top predictions
  return scoredCuisines
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.cuisine);
}

/**
 * Analyze user category preferences based on ratings and frequency
 */
function analyzeUserCategoryPreferences(
  userProgress: UserCuisineProgress[], 
  allCuisines: Cuisine[]
): Record<string, number> {
  const categoryStats: Record<string, { count: number, totalRating: number, avgRating: number }> = {};

  userProgress.forEach(progress => {
    const cuisine = progress.cuisine || allCuisines.find(c => c.id === progress.cuisine_id);
    if (!cuisine) return;

    if (!categoryStats[cuisine.category]) {
      categoryStats[cuisine.category] = { count: 0, totalRating: 0, avgRating: 0 };
    }

    categoryStats[cuisine.category].count++;
    if (progress.rating) {
      categoryStats[cuisine.category].totalRating += progress.rating;
    }
  });

  // Calculate preferences (frequency + rating)
  const preferences: Record<string, number> = {};
  const maxCount = Math.max(...Object.values(categoryStats).map(s => s.count));

  Object.entries(categoryStats).forEach(([category, stats]) => {
    const avgRating = stats.totalRating > 0 ? stats.totalRating / stats.count : 3; // Default to neutral
    const frequencyScore = stats.count / maxCount; // Normalize frequency
    const ratingScore = (avgRating - 1) / 4; // Normalize rating (1-5 -> 0-1)
    
    preferences[category] = (frequencyScore * 0.6) + (ratingScore * 0.4);
  });

  return preferences;
}

/**
 * Analyze user rating patterns
 */
function analyzeUserRatingPatterns(userProgress: UserCuisineProgress[]): {
  averageRating: number;
  ratingDistribution: Record<number, number>;
} {
  const ratingsWithValues = userProgress.filter(p => p.rating).map(p => p.rating!);
  
  const averageRating = ratingsWithValues.length > 0 
    ? ratingsWithValues.reduce((sum, rating) => sum + rating, 0) / ratingsWithValues.length
    : 3;

  const ratingDistribution: Record<number, number> = {};
  [1, 2, 3, 4, 5].forEach(rating => {
    ratingDistribution[rating] = ratingsWithValues.filter(r => r === rating).length;
  });

  return { averageRating, ratingDistribution };
}

/**
 * Analyze recent exploration patterns
 */
function analyzeRecentExplorationPatterns(userProgress: UserCuisineProgress[]): {
  countries: Record<string, number>;
  recentCategories: string[];
} {
  const recentCount = Math.min(10, userProgress.length);
  const recentProgress = userProgress
    .sort((a, b) => new Date(b.first_tried_at).getTime() - new Date(a.first_tried_at).getTime())
    .slice(0, recentCount);

  const countries: Record<string, number> = {};
  const recentCategories: string[] = [];

  recentProgress.forEach(progress => {
    if (progress.cuisine?.origin_country) {
      countries[progress.cuisine.origin_country] = (countries[progress.cuisine.origin_country] || 0) + 1;
    }
    if (progress.cuisine?.category) {
      recentCategories.push(progress.cuisine.category);
    }
  });

  // Normalize country scores
  const maxCountryCount = Math.max(...Object.values(countries), 1);
  Object.keys(countries).forEach(country => {
    countries[country] = countries[country] / maxCountryCount;
  });

  return { countries, recentCategories };
}