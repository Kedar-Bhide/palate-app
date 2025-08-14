/**
 * Cuisine Sync Manager
 * Handles offline data synchronization and background sync for cuisine progress
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser } from './supabase';
import {
  fetchAllCuisines,
  fetchUserProgress,
  createCuisineProgress,
  updateCuisineProgress,
  getCuisineStatistics,
  DatabaseResponse,
} from './cuisineDatabase';
import {
  Cuisine,
  UserCuisineProgress,
} from '../types/cuisine';

// Storage keys
const STORAGE_KEYS = {
  CUISINES: '@cuisine_sync/cuisines',
  USER_PROGRESS: '@cuisine_sync/user_progress',
  PENDING_SYNC: '@cuisine_sync/pending_sync',
  LAST_SYNC: '@cuisine_sync/last_sync',
  OFFLINE_MODE: '@cuisine_sync/offline_mode',
  CACHE_VERSION: '@cuisine_sync/cache_version',
} as const;

// Cache version for invalidating old cache
const CURRENT_CACHE_VERSION = '1.0.0';

// Sync queue item
export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: string;
  data: any;
  retryCount: number;
  maxRetries: number;
}

// Sync status
export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingItems: number;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
}

// Sync manager class
class CuisineSyncManager {
  private syncInProgress = false;
  private retryDelay = 1000; // Start with 1 second
  private maxRetryDelay = 30000; // Max 30 seconds
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initializeCache();
    this.setupNetworkListener();
  }

  /**
   * Initialize cache and check version
   */
  private async initializeCache(): Promise<void> {
    try {
      const cachedVersion = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_VERSION);
      
      if (cachedVersion !== CURRENT_CACHE_VERSION) {
        console.log('🔄 Cache version mismatch, clearing cache');
        await this.clearCache();
        await AsyncStorage.setItem(STORAGE_KEYS.CACHE_VERSION, CURRENT_CACHE_VERSION);
      }
    } catch (error) {
      console.error('❌ Error initializing cache:', error);
    }
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener(): void {
    // Note: In a real implementation, you'd use @react-native-netinfo
    // This is a placeholder for the network listener setup
    console.log('📡 Network listener setup placeholder');
  }

  /**
   * Add sync status listener
   */
  public addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify sync listeners
   */
  private async notifySyncListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  /**
   * Get current sync status
   */
  public async getSyncStatus(): Promise<SyncStatus> {
    try {
      const [lastSyncTime, pendingItems, offlineMode] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
        this.getPendingSyncItems(),
        this.isOfflineMode(),
      ]);

      return {
        isOnline: !offlineMode,
        lastSyncTime,
        pendingItems: pendingItems.length,
        isSyncing: this.syncInProgress,
        hasUnsyncedChanges: pendingItems.length > 0,
      };
    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      return {
        isOnline: false,
        lastSyncTime: null,
        pendingItems: 0,
        isSyncing: false,
        hasUnsyncedChanges: false,
      };
    }
  }

  /**
   * Cache cuisines data
   */
  public async cacheCuisines(cuisines: Cuisine[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUISINES, JSON.stringify({
        data: cuisines,
        timestamp: new Date().toISOString(),
      }));
      console.log(`💾 Cached ${cuisines.length} cuisines`);
    } catch (error) {
      console.error('❌ Error caching cuisines:', error);
    }
  }

  /**
   * Get cached cuisines
   */
  public async getCachedCuisines(): Promise<Cuisine[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CUISINES);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - new Date(timestamp).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          console.log(`📱 Using cached cuisines (${data.length} items)`);
          return data;
        }
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting cached cuisines:', error);
      return [];
    }
  }

  /**
   * Cache user progress
   */
  public async cacheUserProgress(progress: UserCuisineProgress[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROGRESS, JSON.stringify({
        data: progress,
        timestamp: new Date().toISOString(),
      }));
      console.log(`💾 Cached ${progress.length} progress entries`);
    } catch (error) {
      console.error('❌ Error caching user progress:', error);
    }
  }

  /**
   * Get cached user progress
   */
  public async getCachedUserProgress(): Promise<UserCuisineProgress[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROGRESS);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        
        // Cache is valid for 1 hour for user progress
        const cacheAge = Date.now() - new Date(timestamp).getTime();
        if (cacheAge < 60 * 60 * 1000) {
          console.log(`📱 Using cached user progress (${data.length} items)`);
          return data;
        }
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting cached user progress:', error);
      return [];
    }
  }

  /**
   * Add item to sync queue
   */
  public async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queueItem: SyncQueueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        ...item,
      };

      const existingItems = await this.getPendingSyncItems();
      existingItems.push(queueItem);

      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(existingItems));
      console.log(`📝 Added item to sync queue: ${queueItem.type}`);
      
      await this.notifySyncListeners();
      
      // Try to sync immediately if online
      if (!(await this.isOfflineMode())) {
        this.syncPendingItems();
      }
    } catch (error) {
      console.error('❌ Error adding to sync queue:', error);
    }
  }

  /**
   * Get pending sync items
   */
  private async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    try {
      const pending = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('❌ Error getting pending sync items:', error);
      return [];
    }
  }

  /**
   * Set offline mode
   */
  public async setOfflineMode(offline: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, JSON.stringify(offline));
      await this.notifySyncListeners();
      
      if (!offline) {
        // Coming back online, try to sync
        this.syncPendingItems();
      }
    } catch (error) {
      console.error('❌ Error setting offline mode:', error);
    }
  }

  /**
   * Check if in offline mode
   */
  public async isOfflineMode(): Promise<boolean> {
    try {
      const offline = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
      return offline ? JSON.parse(offline) : false;
    } catch (error) {
      console.error('❌ Error checking offline mode:', error);
      return false;
    }
  }

  /**
   * Sync pending items to server
   */
  public async syncPendingItems(): Promise<void> {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    await this.notifySyncListeners();

    try {
      const pendingItems = await this.getPendingSyncItems();
      console.log(`🔄 Starting sync of ${pendingItems.length} items`);

      const successfulItems: string[] = [];
      const failedItems: SyncQueueItem[] = [];

      for (const item of pendingItems) {
        try {
          const success = await this.syncSingleItem(item);
          if (success) {
            successfulItems.push(item.id);
          } else {
            // Increment retry count
            item.retryCount++;
            if (item.retryCount < item.maxRetries) {
              failedItems.push(item);
            } else {
              console.error(`❌ Max retries exceeded for item ${item.id}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error syncing item ${item.id}:`, error);
          item.retryCount++;
          if (item.retryCount < item.maxRetries) {
            failedItems.push(item);
          }
        }
      }

      // Update pending items (remove successful, keep failed)
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(failedItems));

      // Update last sync time if any items were successful
      if (successfulItems.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        console.log(`✅ Successfully synced ${successfulItems.length} items`);
      }

      if (failedItems.length > 0) {
        console.log(`⚠️ ${failedItems.length} items failed to sync`);
        // Schedule retry with exponential backoff
        setTimeout(() => this.syncPendingItems(), this.getRetryDelay());
      }

    } catch (error) {
      console.error('❌ Error during sync:', error);
    } finally {
      this.syncInProgress = false;
      await this.notifySyncListeners();
    }
  }

  /**
   * Sync a single item
   */
  private async syncSingleItem(item: SyncQueueItem): Promise<boolean> {
    try {
      switch (item.type) {
        case 'create':
          return await this.syncCreateItem(item);
        case 'update':
          return await this.syncUpdateItem(item);
        case 'delete':
          return await this.syncDeleteItem(item);
        default:
          console.error(`❌ Unknown sync type: ${item.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Error syncing single item:`, error);
      return false;
    }
  }

  /**
   * Sync create item
   */
  private async syncCreateItem(item: SyncQueueItem): Promise<boolean> {
    const { userId, cuisineId, restaurantName, notes, rating } = item.data;
    
    const response = await createCuisineProgress(userId, cuisineId, restaurantName, notes, rating);
    
    if (response.error) {
      console.error('❌ Error creating cuisine progress:', response.error);
      return false;
    }

    return true;
  }

  /**
   * Sync update item
   */
  private async syncUpdateItem(item: SyncQueueItem): Promise<boolean> {
    const { progressId, updates } = item.data;
    
    const response = await updateCuisineProgress(progressId, updates);
    
    if (response.error) {
      console.error('❌ Error updating cuisine progress:', response.error);
      return false;
    }

    return true;
  }

  /**
   * Sync delete item
   */
  private async syncDeleteItem(item: SyncQueueItem): Promise<boolean> {
    // Implement delete sync logic if needed
    console.log('🗑️ Delete sync not implemented yet');
    return true;
  }

  /**
   * Get retry delay with exponential backoff
   */
  private getRetryDelay(): number {
    const delay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
    this.retryDelay = delay;
    return delay;
  }

  /**
   * Force full sync
   */
  public async forceFullSync(): Promise<void> {
    console.log('🔄 Starting force full sync');
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch fresh data from server
      const [cuisinesResponse, progressResponse] = await Promise.all([
        fetchAllCuisines(),
        fetchUserProgress(user.id),
      ]);

      if (cuisinesResponse.error) {
        throw new Error(`Failed to fetch cuisines: ${cuisinesResponse.error}`);
      }

      if (progressResponse.error) {
        throw new Error(`Failed to fetch progress: ${progressResponse.error}`);
      }

      // Cache fresh data
      await Promise.all([
        this.cacheCuisines(cuisinesResponse.data || []),
        this.cacheUserProgress(progressResponse.data || []),
      ]);

      // Sync pending items
      await this.syncPendingItems();

      console.log('✅ Force full sync completed');
    } catch (error) {
      console.error('❌ Error during force full sync:', error);
      throw error;
    }
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.CUISINES),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PROGRESS),
        AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SYNC),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC),
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_MODE),
      ]);
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * Get cache size information
   */
  public async getCacheInfo(): Promise<{
    cuisinesCacheSize: number;
    progressCacheSize: number;
    pendingSyncSize: number;
    lastSyncTime: string | null;
  }> {
    try {
      const [cuisines, progress, pending, lastSync] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CUISINES),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROGRESS),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
      ]);

      return {
        cuisinesCacheSize: cuisines ? JSON.parse(cuisines).data.length : 0,
        progressCacheSize: progress ? JSON.parse(progress).data.length : 0,
        pendingSyncSize: pending ? JSON.parse(pending).length : 0,
        lastSyncTime: lastSync,
      };
    } catch (error) {
      console.error('❌ Error getting cache info:', error);
      return {
        cuisinesCacheSize: 0,
        progressCacheSize: 0,
        pendingSyncSize: 0,
        lastSyncTime: null,
      };
    }
  }
}

// Export singleton instance
export const cuisineSyncManager = new CuisineSyncManager();

// Convenience functions
export const {
  addSyncListener,
  getSyncStatus,
  cacheCuisines,
  getCachedCuisines,
  cacheUserProgress,
  getCachedUserProgress,
  addToSyncQueue,
  setOfflineMode,
  isOfflineMode,
  syncPendingItems,
  forceFullSync,
  clearCache,
  getCacheInfo,
} = cuisineSyncManager;

// Default export
export default cuisineSyncManager;