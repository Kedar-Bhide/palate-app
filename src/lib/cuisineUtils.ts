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