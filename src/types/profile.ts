import { User, Post } from './index';

export interface ProfileStats {
  postsCount: number;
  friendsCount: number;
  cuisinesCount: number;
  achievementsCount: number;
  joinDate: string;
  lastActive: string;
}

export interface ProfileUpdateData {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  is_private?: boolean;
}

export interface PrivacySettings {
  isPrivate: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showLastSeen: boolean;
  allowFriendRequests: 'everyone' | 'friends_of_friends' | 'off';
  postVisibility: 'public' | 'friends' | 'custom';
  whoCanSendMessages: 'everyone' | 'friends' | 'off';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface ProfileData {
  user: User;
  stats: ProfileStats;
  achievements: Achievement[];
  recentPosts: Post[];
  isOwnProfile: boolean;
  followStatus?: 'follow' | 'following' | 'friends' | 'blocked';
}

export interface UserLocation {
  city?: string;
  state?: string;
  country?: string;
  displayName: string;
}

export interface ProfilePhotoUpload {
  uri: string;
  type: string;
  fileName: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  friendRequests: 'push' | 'email' | 'both' | 'off';
  newPosts: 'push' | 'email' | 'both' | 'off';
  likesAndComments: 'push' | 'email' | 'both' | 'off';
  achievements: 'push' | 'email' | 'both' | 'off';
  weeklySummary: 'email' | 'off';
  marketing: 'email' | 'off';
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  };
}

export interface AccountSettings {
  twoFactorEnabled: boolean;
  connectedAccounts: {
    google?: boolean;
    apple?: boolean;
  };
  dataExportRequested?: string; // ISO date string
  accountDeletionRequested?: string; // ISO date string
}

export interface AppPreferences {
  darkMode: 'auto' | 'light' | 'dark';
  language: string;
  measurementUnit: 'metric' | 'imperial';
  autoPlayVideos: boolean;
  reducedMotion: boolean;
  hapticFeedback: boolean;
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface EditProfileFormData {
  display_name: string;
  username: string;
  bio: string;
  location: string;
  avatar_url?: string;
  isPrivate: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number; // in minutes
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
  passwordLastChanged: string;
}

export interface LoginEvent {
  id: string;
  timestamp: string;
  location: string;
  device: string;
  ipAddress: string;
  success: boolean;
  userAgent?: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  ipAddress: string;
  current: boolean;
}

export interface ProfileExportData {
  profile: User;
  posts: Post[];
  friendships: any[];
  cuisineProgress: any[];
  achievements: Achievement[];
  activityLog: any[];
  exportDate: string;
  version: string;
}

export interface DataExportOptions {
  includeProfile: boolean;
  includePosts: boolean;
  includeFriends: boolean;
  includeCuisines: boolean;
  includeAchievements: boolean;
  includeActivity: boolean;
  format: 'json' | 'csv' | 'pdf';
}

export interface ThemePreferences {
  mode: 'light' | 'dark' | 'auto' | 'high-contrast';
  primaryColor?: string;
  accentColor?: string;
  reduceMotion: boolean;
  increasedContrast: boolean;
}