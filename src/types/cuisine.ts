export interface Cuisine {
  id: number;
  name: string;
  category: string;
  emoji: string;
  description?: string;
  origin_country?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserCuisineProgress {
  id: string;
  user_id: string;
  cuisine_id: number;
  first_tried_at: string;
  times_tried: number;
  favorite_restaurant?: string;
  notes?: string;
  rating?: number; // 1-5 scale for how much they like this cuisine
  created_at: string;
  updated_at?: string;
  photos?: string[]; // Array of photo URLs for social sharing achievements
  cuisine?: Cuisine; // Populated when joined with cuisines table
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

export type AchievementType = 
  | 'milestone' 
  | 'cuisine_count' 
  | 'country_diversity' 
  | 'category_diversity' 
  | 'category_specialist' 
  | 'streak' 
  | 'social_sharing' 
  | 'speed_challenge';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  unlockedAt?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'exploration' | 'diversity' | 'social' | 'streak' | 'specialist' | 'challenge';
  type?: AchievementType;
  tips?: string[];
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  points?: number;
  metadata?: Record<string, any>;
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
  progress: number;      // 0-1 completion ratio
  isUnlocked: boolean;
  current: number;       // Current progress value
  target: number;        // Target threshold
}

// Component Props Interfaces
export interface CuisineCardProps {
  cuisine: Cuisine;
  userProgress?: UserCuisineProgress;
  onPress: (cuisine: Cuisine) => void;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  disabled?: boolean;
}

export interface ProgressStatsProps {
  totalCuisines: number;
  triedCuisines: number;
  userProgress: UserCuisineProgress[];
  onStatsPress?: () => void;
  compact?: boolean;
}

// Utility type for cuisine with progress information
export interface CuisineWithProgress extends Cuisine {
  userProgress?: UserCuisineProgress;
  isTried: boolean;
  timesTried: number;
  lastTriedAt?: string;
  favoriteRestaurant?: string;
  userRating?: number;
}