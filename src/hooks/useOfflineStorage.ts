import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version: number;
}

export interface SyncStatus {
  isOnline: boolean;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  pendingActions: number;
  failedActions: number;
}

interface UseOfflineStorageReturn {
  // Cache operations
  cacheData: <T>(key: string, data: T, ttl?: number) => Promise<void>;
  getCachedData: <T>(key: string) => Promise<T | null>;
  invalidateCache: (keyPattern: string) => Promise<void>;
  clearCache: () => Promise<void>;
  
  // Offline action queue
  queueOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncWhenOnline: () => Promise<void>;
  getQueuedActions: () => Promise<OfflineAction[]>;
  removeQueuedAction: (actionId: string) => Promise<void>;
  clearActionQueue: () => Promise<void>;
  
  // State
  syncStatus: SyncStatus;
  offlineData: Record<string, any>;
  queuedActions: OfflineAction[];
  
  // Utilities
  isDataStale: (key: string, maxAge?: number) => Promise<boolean>;
  getStorageInfo: () => Promise<{ cacheSize: number; actionQueueSize: number; }>;
  compactStorage: () => Promise<void>;
}

const CACHE_PREFIX = '@offline_cache_';
const ACTION_QUEUE_KEY = '@action_queue';
const SYNC_METADATA_KEY = '@sync_metadata';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_ACTION_QUEUE_SIZE = 500;
const CACHE_VERSION = 1;

export const useOfflineStorage = (): UseOfflineStorageReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    syncInProgress: false,
    lastSyncTime: null,
    pendingActions: 0,
    failedActions: 0,
  });
  
  const [offlineData, setOfflineData] = useState<Record<string, any>>({});
  const [queuedActions, setQueuedActions] = useState<OfflineAction[]>([]);
  
  const syncInProgress = useRef(false);
  const actionIdCounter = useRef(0);

  // Initialize on mount
  useEffect(() => {
    initializeOfflineStorage();
    setupNetworkListener();
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (syncStatus.isOnline && queuedActions.length > 0 && !syncInProgress.current) {
      syncWhenOnline();
    }
  }, [syncStatus.isOnline, queuedActions.length]);

  const initializeOfflineStorage = async () => {
    try {
      // Load queued actions
      const actions = await loadQueuedActions();
      setQueuedActions(actions);
      
      // Load sync metadata
      const metadata = await loadSyncMetadata();
      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: metadata.lastSyncTime,
        pendingActions: actions.length,
      }));
      
      // Perform initial cleanup
      await cleanupExpiredCache();
    } catch (error) {
      console.warn('Failed to initialize offline storage:', error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      setSyncStatus(prev => ({ ...prev, isOnline: isOnline ?? false }));
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      setSyncStatus(prev => ({ ...prev, isOnline: isOnline ?? false }));
    });

    return unsubscribe;
  };

  const generateCacheKey = (key: string): string => {
    return `${CACHE_PREFIX}${key}`;
  };

  const generateActionId = (): string => {
    actionIdCounter.current += 1;
    return `action_${Date.now()}_${actionIdCounter.current}`;
  };

  const loadQueuedActions = async (): Promise<OfflineAction[]> => {
    try {
      const actionsData = await AsyncStorage.getItem(ACTION_QUEUE_KEY);
      return actionsData ? JSON.parse(actionsData) : [];
    } catch (error) {
      console.warn('Failed to load queued actions:', error);
      return [];
    }
  };

  const saveQueuedActions = async (actions: OfflineAction[]) => {
    try {
      // Limit queue size to prevent memory issues
      const limitedActions = actions.slice(-MAX_ACTION_QUEUE_SIZE);
      await AsyncStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(limitedActions));
    } catch (error) {
      console.warn('Failed to save queued actions:', error);
    }
  };

  const loadSyncMetadata = async () => {
    try {
      const metadataData = await AsyncStorage.getItem(SYNC_METADATA_KEY);
      if (metadataData) {
        const metadata = JSON.parse(metadataData);
        return {
          lastSyncTime: metadata.lastSyncTime ? new Date(metadata.lastSyncTime) : null,
        };
      }
    } catch (error) {
      console.warn('Failed to load sync metadata:', error);
    }
    return { lastSyncTime: null };
  };

  const saveSyncMetadata = async (lastSyncTime: Date) => {
    try {
      const metadata = { lastSyncTime: lastSyncTime.toISOString() };
      await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save sync metadata:', error);
    }
  };

  const cacheData = useCallback(async <T>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: CACHE_VERSION,
      };

      const cacheKey = generateCacheKey(key);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      
      // Update in-memory cache
      setOfflineData(prev => ({ ...prev, [key]: data }));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }, []);

  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    try {
      // Check in-memory cache first
      if (offlineData[key]) {
        return offlineData[key];
      }

      const cacheKey = generateCacheKey(key);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(cachedData);
      
      // Check if data is expired
      const now = Date.now();
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      // Check version compatibility
      if (cacheItem.version !== CACHE_VERSION) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      // Update in-memory cache
      setOfflineData(prev => ({ ...prev, [key]: cacheItem.data }));
      
      return cacheItem.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }, [offlineData]);

  const invalidateCache = useCallback(async (keyPattern: string) => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(CACHE_PREFIX) && key.includes(keyPattern)
      );
      
      await AsyncStorage.multiRemove(cacheKeys);
      
      // Update in-memory cache
      setOfflineData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(key => {
          if (key.includes(keyPattern)) {
            delete newData[key];
          }
        });
        return newData;
      });
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      
      setOfflineData({});
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, []);

  const queueOfflineAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: generateActionId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3,
      priority: action.priority || 'medium',
    };

    const updatedActions = [...queuedActions, newAction];
    setQueuedActions(updatedActions);
    setSyncStatus(prev => ({ ...prev, pendingActions: updatedActions.length }));
    
    await saveQueuedActions(updatedActions);
  }, [queuedActions]);

  const removeQueuedAction = useCallback(async (actionId: string) => {
    const updatedActions = queuedActions.filter(action => action.id !== actionId);
    setQueuedActions(updatedActions);
    setSyncStatus(prev => ({ ...prev, pendingActions: updatedActions.length }));
    
    await saveQueuedActions(updatedActions);
  }, [queuedActions]);

  const clearActionQueue = useCallback(async () => {
    setQueuedActions([]);
    setSyncStatus(prev => ({ ...prev, pendingActions: 0, failedActions: 0 }));
    await AsyncStorage.removeItem(ACTION_QUEUE_KEY);
  }, []);

  const getQueuedActions = useCallback(async (): Promise<OfflineAction[]> => {
    return queuedActions;
  }, [queuedActions]);

  const syncWhenOnline = useCallback(async () => {
    if (!syncStatus.isOnline || syncInProgress.current || queuedActions.length === 0) {
      return;
    }

    syncInProgress.current = true;
    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));

    try {
      // Sort actions by priority and timestamp
      const sortedActions = [...queuedActions].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      const failedActions: OfflineAction[] = [];
      let successCount = 0;

      for (const action of sortedActions) {
        try {
          // Execute the action - this would need to be implemented based on your app's needs
          console.log('Syncing action:', action);
          
          // Simulate action execution
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Remove successful action
          await removeQueuedAction(action.id);
          successCount++;
          
        } catch (error) {
          console.warn('Failed to sync action:', action, error);
          
          // Increment retry count
          const updatedAction = {
            ...action,
            retryCount: action.retryCount + 1,
          };
          
          // Keep if under max retries
          if (updatedAction.retryCount < updatedAction.maxRetries) {
            failedActions.push(updatedAction);
          } else {
            // Remove from queue if max retries exceeded
            await removeQueuedAction(action.id);
          }
        }
      }

      // Update failed actions count
      setSyncStatus(prev => ({ 
        ...prev, 
        failedActions: failedActions.length,
        lastSyncTime: new Date(),
      }));

      // Save sync metadata
      await saveSyncMetadata(new Date());

      console.log(`Sync completed: ${successCount} successful, ${failedActions.length} failed`);
      
    } finally {
      syncInProgress.current = false;
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [syncStatus.isOnline, queuedActions, removeQueuedAction]);

  const isDataStale = useCallback(async (key: string, maxAge: number = DEFAULT_TTL): Promise<boolean> => {
    try {
      const cacheKey = generateCacheKey(key);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return true;
      }

      const cacheItem: CacheItem = JSON.parse(cachedData);
      const age = Date.now() - cacheItem.timestamp;
      
      return age > maxAge;
    } catch (error) {
      console.warn('Failed to check if data is stale:', error);
      return true;
    }
  }, []);

  const getStorageInfo = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      
      // Estimate storage sizes (rough calculation)
      const cacheSize = cacheKeys.length * 1024; // Rough estimate
      const actionQueueSize = queuedActions.length * 512; // Rough estimate
      
      return { cacheSize, actionQueueSize };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return { cacheSize: 0, actionQueueSize: 0 };
    }
  }, [queuedActions.length]);

  const cleanupExpiredCache = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      const expiredKeys: string[] = [];
      
      for (const cacheKey of cacheKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const cacheItem: CacheItem = JSON.parse(cachedData);
            const now = Date.now();
            
            if (now - cacheItem.timestamp > cacheItem.ttl || 
                cacheItem.version !== CACHE_VERSION) {
              expiredKeys.push(cacheKey);
            }
          }
        } catch (error) {
          // If we can't parse, consider it expired
          expiredKeys.push(cacheKey);
        }
      }
      
      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired cache:', error);
    }
  };

  const compactStorage = useCallback(async () => {
    try {
      // Remove expired cache
      await cleanupExpiredCache();
      
      // Remove failed actions that have exceeded max retries
      const validActions = queuedActions.filter(action => 
        action.retryCount < action.maxRetries
      );
      
      if (validActions.length !== queuedActions.length) {
        setQueuedActions(validActions);
        await saveQueuedActions(validActions);
        setSyncStatus(prev => ({ ...prev, pendingActions: validActions.length }));
      }
      
      console.log('Storage compaction completed');
    } catch (error) {
      console.warn('Failed to compact storage:', error);
    }
  }, [queuedActions]);

  // Periodic cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupExpiredCache();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    // Cache operations
    cacheData,
    getCachedData,
    invalidateCache,
    clearCache,
    
    // Offline action queue
    queueOfflineAction,
    syncWhenOnline,
    getQueuedActions,
    removeQueuedAction,
    clearActionQueue,
    
    // State
    syncStatus,
    offlineData,
    queuedActions,
    
    // Utilities
    isDataStale,
    getStorageInfo,
    compactStorage,
  };
};