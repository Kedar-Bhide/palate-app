/**
 * useDrafts Hook
 * Draft management hook for auto-saving and managing draft posts
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostData } from './usePosts';

export interface DraftPostData extends PostData {
  id: string;
  createdAt: string;
  updatedAt: string;
  title?: string; // Auto-generated title for draft identification
  photoCount: number; // For quick preview
}

export interface DraftSummary {
  id: string;
  title: string;
  restaurantName: string;
  cuisine: string;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
  thumbnailUri?: string; // First photo thumbnail
}

const DRAFTS_STORAGE_KEY = 'meal_post_drafts';
const DRAFT_EXPIRY_DAYS = 30;
const AUTO_SAVE_DELAY = 3000; // 3 seconds debounce

export const useDrafts = () => {
  const [drafts, setDrafts] = useState<DraftPostData[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autoSaveTimer = useRef<NodeJS.Timeout>();

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  /**
   * Generate a title for the draft based on content
   */
  const generateDraftTitle = useCallback((postData: Partial<PostData>): string => {
    if (postData.restaurantName && postData.cuisine) {
      return `${postData.restaurantName} - ${postData.cuisine}`;
    } else if (postData.restaurantName) {
      return postData.restaurantName;
    } else if (postData.cuisine) {
      return `${postData.cuisine} Restaurant`;
    } else if (postData.photos && postData.photos.length > 0) {
      return `Draft with ${postData.photos.length} photo${postData.photos.length > 1 ? 's' : ''}`;
    } else {
      return 'Untitled Draft';
    }
  }, []);

  /**
   * Check if draft has expired
   */
  const isDraftExpired = useCallback((draft: DraftPostData): boolean => {
    const createdDate = new Date(draft.createdAt);
    const expiryDate = new Date(createdDate);
    expiryDate.setDate(expiryDate.getDate() + DRAFT_EXPIRY_DAYS);
    return new Date() > expiryDate;
  }, []);

  /**
   * Load all drafts from storage
   */
  const loadDrafts = useCallback(async (): Promise<DraftPostData[]> => {
    setIsLoadingDrafts(true);
    setError(null);

    try {
      const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      let loadedDrafts: DraftPostData[] = [];

      if (stored) {
        const allDrafts: DraftPostData[] = JSON.parse(stored);
        
        // Filter out expired drafts
        loadedDrafts = allDrafts.filter(draft => !isDraftExpired(draft));
        
        // If we filtered out expired drafts, update storage
        if (loadedDrafts.length !== allDrafts.length) {
          await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(loadedDrafts));
        }
      }

      // Sort by updated time (most recent first)
      loadedDrafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setDrafts(loadedDrafts);
      return loadedDrafts;
    } catch (error) {
      console.error('Error loading drafts:', error);
      setError('Failed to load drafts');
      return [];
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [isDraftExpired]);

  /**
   * Save a draft
   */
  const saveDraft = useCallback(async (
    draftData: Omit<DraftPostData, 'id' | 'createdAt' | 'updatedAt' | 'title' | 'photoCount'> | PostData,
    draftId?: string
  ): Promise<string> => {
    setIsSavingDraft(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const photoCount = draftData.photos ? draftData.photos.length : 0;
      
      // Create or update draft
      const draft: DraftPostData = {
        ...draftData,
        id: draftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: generateDraftTitle(draftData),
        photoCount,
        createdAt: draftId ? drafts.find(d => d.id === draftId)?.createdAt || now : now,
        updatedAt: now,
      };

      // Load current drafts
      const currentDrafts = await loadDrafts();
      
      // Remove existing draft with same ID if updating
      const filteredDrafts = currentDrafts.filter(d => d.id !== draft.id);
      
      // Add new/updated draft at the beginning
      const updatedDrafts = [draft, ...filteredDrafts];
      
      // Limit to reasonable number of drafts (e.g., 50)
      const limitedDrafts = updatedDrafts.slice(0, 50);
      
      // Save to storage
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(limitedDrafts));
      
      setDrafts(limitedDrafts);
      setLastSaveTime(new Date());
      
      console.log(`Draft saved: ${draft.title}`);
      return draft.id;
    } catch (error) {
      console.error('Error saving draft:', error);
      setError('Failed to save draft');
      throw new Error('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  }, [drafts, generateDraftTitle, loadDrafts]);

  /**
   * Auto-save draft with debouncing
   */
  const autoSaveDraft = useCallback((
    postData: PostData,
    draftId?: string
  ): void => {
    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Set new timer
    autoSaveTimer.current = setTimeout(async () => {
      try {
        // Only auto-save if there's meaningful content
        const hasContent = (
          postData.restaurantName?.trim() ||
          postData.cuisine?.trim() ||
          postData.review?.trim() ||
          (postData.photos && postData.photos.length > 0)
        );

        if (hasContent) {
          await saveDraft(postData, draftId);
        }
      } catch (error) {
        console.warn('Auto-save failed:', error);
        // Don't show error for auto-save failures to avoid interrupting user
      }
    }, AUTO_SAVE_DELAY);
  }, [saveDraft]);

  /**
   * Delete a draft
   */
  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    setError(null);

    try {
      const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      setDrafts(updatedDrafts);
      
      console.log(`Draft deleted: ${draftId}`);
    } catch (error) {
      console.error('Error deleting draft:', error);
      setError('Failed to delete draft');
      throw new Error('Failed to delete draft');
    }
  }, [drafts]);

  /**
   * Delete all drafts
   */
  const deleteAllDrafts = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      await AsyncStorage.removeItem(DRAFTS_STORAGE_KEY);
      setDrafts([]);
      setLastSaveTime(null);
      
      console.log('All drafts deleted');
    } catch (error) {
      console.error('Error deleting all drafts:', error);
      setError('Failed to delete all drafts');
      throw new Error('Failed to delete all drafts');
    }
  }, []);

  /**
   * Get a specific draft by ID
   */
  const getDraft = useCallback((draftId: string): DraftPostData | null => {
    return drafts.find(draft => draft.id === draftId) || null;
  }, [drafts]);

  /**
   * Restore draft for editing
   */
  const restoreDraft = useCallback((draftId: string): DraftPostData | null => {
    const draft = getDraft(draftId);
    
    if (!draft) {
      setError('Draft not found');
      return null;
    }

    if (isDraftExpired(draft)) {
      setError('Draft has expired');
      return null;
    }

    return draft;
  }, [getDraft, isDraftExpired]);

  /**
   * Get draft summaries for list display
   */
  const getDraftSummaries = useCallback((): DraftSummary[] => {
    return drafts.map(draft => ({
      id: draft.id,
      title: draft.title || generateDraftTitle(draft),
      restaurantName: draft.restaurantName,
      cuisine: draft.cuisine,
      photoCount: draft.photoCount,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      thumbnailUri: draft.photos && draft.photos.length > 0 ? draft.photos[0] : undefined,
    }));
  }, [drafts, generateDraftTitle]);

  /**
   * Check if there are any drafts
   */
  const hasDrafts = useCallback((): boolean => {
    return drafts.length > 0;
  }, [drafts]);

  /**
   * Get formatted last save time
   */
  const getLastSaveTimeFormatted = useCallback((): string | null => {
    if (!lastSaveTime) return null;

    const now = new Date();
    const diff = now.getTime() - lastSaveTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return 'Saved just now';
    } else if (minutes < 60) {
      return `Saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `Saved ${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return `Saved ${days} day${days > 1 ? 's' : ''} ago`;
    }
  }, [lastSaveTime]);

  /**
   * Cleanup expired drafts
   */
  const cleanupExpiredDrafts = useCallback(async (): Promise<number> => {
    try {
      const currentDrafts = await loadDrafts();
      const validDrafts = currentDrafts.filter(draft => !isDraftExpired(draft));
      const expiredCount = currentDrafts.length - validDrafts.length;

      if (expiredCount > 0) {
        await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(validDrafts));
        setDrafts(validDrafts);
        console.log(`Cleaned up ${expiredCount} expired drafts`);
      }

      return expiredCount;
    } catch (error) {
      console.error('Error cleaning up expired drafts:', error);
      return 0;
    }
  }, [loadDrafts, isDraftExpired]);

  /**
   * Clear auto-save timer on unmount
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  return {
    // State
    drafts: getDraftSummaries(),
    isLoadingDrafts,
    isSavingDraft,
    lastSaveTime,
    lastSaveTimeFormatted: getLastSaveTimeFormatted(),
    error,
    
    // Actions
    loadDrafts,
    saveDraft,
    autoSaveDraft,
    deleteDraft,
    deleteAllDrafts,
    getDraft,
    restoreDraft,
    hasDrafts,
    cleanupExpiredDrafts,
    
    // Utils
    generateDraftTitle,
    isDraftExpired,
  };
};