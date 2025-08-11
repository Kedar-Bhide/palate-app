export interface Cuisine {
  id: number;
  name: string;
  category: string;
  emoji: string;
  description?: string;
  origin_country?: string;
}

export interface UserCuisineProgress {
  id: string;
  user_id: string;
  cuisine_id: number;
  first_tried_at: string;
  times_tried: number;
  favorite_restaurant?: string;
  cuisine?: Cuisine;
}

export interface ProgressStats {
  totalCuisines: number;
  triedCuisines: number;
  percentage: number;
  diversityScore: number;
  currentStreak: number;
  monthlyProgress: number;
  nextGoal: { goal: number; remaining: number };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  unlockedAt?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'exploration' | 'diversity' | 'social' | 'streak' | 'specialist';
  tips?: string[];
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface CuisineFilter {
  status: 'all' | 'tried' | 'untried';
  category?: string;
  searchQuery?: string;
}

export interface CuisineCategory {
  name: string;
  cuisines: Cuisine[];
  triedCount: number;
}

export interface ProgressGoal {
  threshold: number;
  name: string;
  description: string;
  icon: string;
  achieved: boolean;
}

export interface CuisineStreak {
  current: number;
  longest: number;
  lastTryDate?: string;
}

export interface MonthlyProgress {
  month: string;
  year: number;
  cuisinesTried: number;
  newCuisines: Cuisine[];
}

export interface DiversityMetrics {
  score: number;
  categoryCoverage: Record<string, number>;
  totalCategories: number;
  triedCategories: number;
}

export interface Goal {
  id: string;
  type: 'monthly' | 'yearly' | 'streak' | 'category' | 'social';
  title: string;
  description: string;
  target: number;
  current: number;
  deadline?: string;
  completed: boolean;
  createdAt: string;
}

export interface CuisineSuggestion {
  cuisine: Cuisine;
  reason: 'preference' | 'trending' | 'friends' | 'seasonal' | 'challenge';
  confidence: number;
  description: string;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  total: number;
  isUnlocked: boolean;
}