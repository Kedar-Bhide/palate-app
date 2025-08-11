import { useState, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  DataExportOptions,
  ProfileExportData,
  LoginEvent,
} from '../types/profile';
import { User, Post } from '../types';

interface UseDataExportReturn {
  exporting: boolean;
  exportProgress: number;
  exportedFilePath: string | null;
  error: string | null;
  exportUserData: (options: DataExportOptions) => Promise<string | null>;
  estimateExportSize: (options: DataExportOptions) => Promise<number>;
  cancelExport: () => void;
  shareExportedData: (filePath: string) => Promise<void>;
  deleteExportedFile: (filePath: string) => Promise<void>;
  clearError: () => void;
}

export const useDataExport = (): UseDataExportReturn => {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelExport = useCallback(() => {
    setCancelRequested(true);
  }, []);

  const fetchUserData = useCallback(async (options: DataExportOptions): Promise<ProfileExportData> => {
    if (!user?.id) throw new Error('User not authenticated');

    const exportData: ProfileExportData = {
      profile: {} as User,
      posts: [],
      friendships: [],
      cuisineProgress: [],
      achievements: [],
      activityLog: [],
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };

    let progress = 0;
    const totalSteps = Object.values(options).filter(Boolean).length;
    const updateProgress = () => {
      progress += 1;
      setExportProgress(Math.round((progress / totalSteps) * 100));
    };

    try {
      // Export profile data
      if (options.includeProfile) {
        if (cancelRequested) throw new Error('Export cancelled');

        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        exportData.profile = profileData as User;
        updateProgress();
      }

      // Export posts
      if (options.includePosts) {
        if (cancelRequested) throw new Error('Export cancelled');

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            cuisine:cuisines(id, name, category, emoji),
            user:users(id, username, display_name, avatar_url)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        exportData.posts = (postsData as Post[]) || [];
        updateProgress();
      }

      // Export friendships
      if (options.includeFriends) {
        if (cancelRequested) throw new Error('Export cancelled');

        const { data: friendsData, error: friendsError } = await supabase
          .from('friendships')
          .select(`
            *,
            requester:users!requester_id(id, username, display_name, avatar_url),
            addressee:users!addressee_id(id, username, display_name, avatar_url)
          `)
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (friendsError) throw friendsError;
        exportData.friendships = friendsData || [];
        updateProgress();
      }

      // Export cuisine progress
      if (options.includeCuisines) {
        if (cancelRequested) throw new Error('Export cancelled');

        const { data: cuisinesData, error: cuisinesError } = await supabase
          .from('user_cuisine_progress')
          .select(`
            *,
            cuisine:cuisines(id, name, category, emoji)
          `)
          .eq('user_id', user.id);

        if (cuisinesError) throw cuisinesError;
        exportData.cuisineProgress = cuisinesData || [];
        updateProgress();
      }

      // Export achievements
      if (options.includeAchievements) {
        if (cancelRequested) throw new Error('Export cancelled');

        const { data: achievementsData, error: achievementsError } = await supabase
          .from('user_achievements')
          .select(`
            *,
            achievement:achievements(id, title, description, icon, color)
          `)
          .eq('user_id', user.id);

        if (achievementsError) throw achievementsError;
        exportData.achievements = achievementsData || [];
        updateProgress();
      }

      // Export activity log
      if (options.includeActivity) {
        if (cancelRequested) throw new Error('Export cancelled');

        // Note: This would require an activity log table in your database
        const { data: activityData, error: activityError } = await supabase
          .from('user_activity_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1000); // Limit to last 1000 activities

        // If table doesn't exist, continue without error
        if (!activityError) {
          exportData.activityLog = activityData || [];
        }
        updateProgress();
      }

      return exportData;
    } catch (error) {
      if (error instanceof Error && error.message === 'Export cancelled') {
        throw error;
      }
      throw new Error(`Failed to fetch user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [user?.id, cancelRequested]);

  const formatDataAsJSON = useCallback((data: ProfileExportData): string => {
    return JSON.stringify(data, null, 2);
  }, []);

  const formatDataAsCSV = useCallback((data: ProfileExportData): string => {
    let csv = '';

    // Profile data
    if (data.profile) {
      csv += 'Profile Information\n';
      csv += 'Field,Value\n';
      csv += `Username,"${data.profile.username}"\n`;
      csv += `Display Name,"${data.profile.display_name || ''}"\n`;
      csv += `Email,"${data.profile.email}"\n`;
      csv += `Bio,"${data.profile.bio || ''}"\n`;
      csv += `Created At,"${data.profile.created_at}"\n\n`;
    }

    // Posts data
    if (data.posts.length > 0) {
      csv += 'Posts\n';
      csv += 'Restaurant Name,Cuisine,Rating,Review,Location,Created At\n';
      data.posts.forEach(post => {
        csv += `"${post.restaurant_name}","${post.cuisine?.name || ''}","${post.rating || ''}","${post.review_text?.replace(/"/g, '""') || ''}","${post.location_name || ''}","${post.created_at}"\n`;
      });
      csv += '\n';
    }

    // Cuisine progress
    if (data.cuisineProgress.length > 0) {
      csv += 'Cuisine Progress\n';
      csv += 'Cuisine,Times Tried,First Tried,Favorite Restaurant\n';
      data.cuisineProgress.forEach((progress: any) => {
        csv += `"${progress.cuisine?.name || ''}","${progress.times_tried}","${progress.first_tried_at}","${progress.favorite_restaurant || ''}"\n`;
      });
      csv += '\n';
    }

    return csv;
  }, []);

  const generateFileName = useCallback((format: string): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    const username = user?.username || 'user';
    return `palate_export_${username}_${timestamp}.${format}`;
  }, [user?.username]);

  const estimateExportSize = useCallback(async (options: DataExportOptions): Promise<number> => {
    if (!user?.id) return 0;

    try {
      let size = 0;

      if (options.includeProfile) size += 1; // ~1KB for profile
      
      if (options.includePosts) {
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        size += (count || 0) * 2; // ~2KB per post
      }

      if (options.includeFriends) {
        const { count } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
        size += (count || 0) * 0.5; // ~0.5KB per friendship
      }

      if (options.includeCuisines) {
        const { count } = await supabase
          .from('user_cuisine_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        size += (count || 0) * 0.3; // ~0.3KB per cuisine
      }

      if (options.includeAchievements) size += 5; // ~5KB for achievements
      if (options.includeActivity) size += 50; // ~50KB for activity log

      return Math.round(size); // Return size in KB
    } catch (error) {
      console.error('Error estimating export size:', error);
      return 100; // Default estimate
    }
  }, [user?.id]);

  const exportUserData = useCallback(async (options: DataExportOptions): Promise<string | null> => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    setExporting(true);
    setExportProgress(0);
    setError(null);
    setCancelRequested(false);

    try {
      // Fetch data
      const exportData = await fetchUserData(options);
      
      if (cancelRequested) {
        throw new Error('Export cancelled by user');
      }

      // Format data based on selected format
      let formattedData: string;
      let fileExtension: string;
      let mimeType: string;

      switch (options.format) {
        case 'json':
          formattedData = formatDataAsJSON(exportData);
          fileExtension = 'json';
          mimeType = 'application/json';
          break;
        case 'csv':
          formattedData = formatDataAsCSV(exportData);
          fileExtension = 'csv';
          mimeType = 'text/csv';
          break;
        case 'pdf':
          // PDF generation would require a PDF library
          throw new Error('PDF export is not yet supported');
        default:
          throw new Error('Unsupported export format');
      }

      // Save to file
      const fileName = generateFileName(fileExtension);
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, formattedData, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      setExportedFilePath(filePath);
      setExportProgress(100);

      return filePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setError(errorMessage);
      return null;
    } finally {
      setExporting(false);
      setCancelRequested(false);
    }
  }, [user?.id, fetchUserData, formatDataAsJSON, formatDataAsCSV, generateFileName, cancelRequested]);

  const shareExportedData = useCallback(async (filePath: string): Promise<void> => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Share Your Palate Data Export',
        });
      } else {
        Alert.alert(
          'Sharing Not Available',
          'Sharing is not available on this device. The file has been saved to your device storage.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Share Failed',
        'Failed to share the exported file. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const deleteExportedFile = useCallback(async (filePath: string): Promise<void> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
      setExportedFilePath(null);
    } catch (error) {
      console.error('Error deleting exported file:', error);
    }
  }, []);

  return {
    exporting,
    exportProgress,
    exportedFilePath,
    error,
    exportUserData,
    estimateExportSize,
    cancelExport,
    shareExportedData,
    deleteExportedFile,
    clearError,
  };
};