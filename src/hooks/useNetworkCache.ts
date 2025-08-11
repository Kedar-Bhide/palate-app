import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheRequest {
  key: string;
  requestFn: () => Promise<any>;
  ttl?: number;
  priority?: 'high' | 'medium' | 'low';
}

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface NetworkCacheState {
  isOnline: boolean;
  connectionType: string | null;
  isInternetReachable: boolean | null;
  pendingActions: OfflineAction[];
  cacheSize: number;
  lastSync: Date | null;
}

interface UseNetworkCacheReturn {
  // State
  isOnline: boolean;
  connectionType: string | null;
  isInternetReachable: boolean | null;
  pendingActions: OfflineAction[];
  cacheSize: number;
  lastSync: Date | null;
  
  // Cache operations
  cachedRequest: <T>(key: string, requestFn: () => Promise<T>, ttl?: number) => Promise<T>;
  invalidateCache: (pattern: string) => Promise<void>;
  preloadData: (requests: CacheRequest[]) => Promise<void>;
  clearExpiredCache: () => Promise<void>;
  clearAllCache: () => Promise<void>;
  
  // Offline operations
  queueOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncOfflineActions: () => Promise<void>;
  removeOfflineAction: (actionId: string) => Promise<void>;
  
  // Utilities
  getCacheInfo: () => Promise<{ keys: string[]; totalSize: number; }>;
  getNetworkQuality: () => 'poor' | 'good' | 'excellent';
}

const CACHE_PREFIX = '@network_cache_';
const OFFLINE_ACTIONS_KEY = '@offline_actions';
const CACHE_METADATA_KEY = '@cache_metadata';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_OFFLINE_ACTIONS = 100;

// In-memory cache for active requests to prevent duplication
const activeRequests = new Map<string, Promise<any>>();
const memoryCache = new Map<string, CacheEntry>();

export const useNetworkCache = (): UseNetworkCacheReturn => {
  const [networkState, setNetworkState] = useState<NetworkCacheState>({
    isOnline: true,
    connectionType: null,
    isInternetReachable: null,
    pendingActions: [],
    cacheSize: 0,
    lastSync: null,
  });

  const syncInProgress = useRef(false);
  const cleanupTimer = useRef<NodeJS.Timeout>();

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: state.isConnected ?? false,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
      }));
    });

    // Initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: state.isConnected ?? false,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load offline actions and cache metadata on mount
  useEffect(() => {
    loadOfflineActions();
    loadCacheMetadata();
    
    // Setup periodic cleanup
    cleanupTimer.current = setInterval(() => {
      clearExpiredCache();
    }, 60000); // Clean every minute
    
    return () => {
      if (cleanupTimer.current) {
        clearInterval(cleanupTimer.current);
      }
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (networkState.isOnline && networkState.pendingActions.length > 0) {
      syncOfflineActions();
    }
  }, [networkState.isOnline]);

  const loadOfflineActions = async () => {
    try {
      const actionsData = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      if (actionsData) {
        const actions: OfflineAction[] = JSON.parse(actionsData);
        setNetworkState(prev => ({ ...prev, pendingActions: actions }));
      }
    } catch (error) {
      console.warn('Failed to load offline actions:', error);
    }
  };

  const saveOfflineActions = async (actions: OfflineAction[]) => {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions));
    } catch (error) {
      console.warn('Failed to save offline actions:', error);
    }
  };

  const loadCacheMetadata = async () => {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (metadata) {
        const { cacheSize, lastSync } = JSON.parse(metadata);
        setNetworkState(prev => ({
          ...prev,
          cacheSize,
          lastSync: lastSync ? new Date(lastSync) : null,
        }));
      }
    } catch (error) {
      console.warn('Failed to load cache metadata:', error);
    }
  };

  const saveCacheMetadata = async (cacheSize: number, lastSync?: Date) => {
    try {
      const metadata = {
        cacheSize,
        lastSync: lastSync?.toISOString() || networkState.lastSync?.toISOString(),
      };
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save cache metadata:', error);
    }
  };

  const generateCacheKey = (key: string): string => {
    return `${CACHE_PREFIX}${key}`;
  };

  const getCacheEntry = async <T>(key: string): Promise<CacheEntry<T> | null> => {
    try {
      // Check memory cache first
      const memoryEntry = memoryCache.get(key);
      if (memoryEntry && Date.now() - memoryEntry.timestamp < memoryEntry.ttl) {
        return memoryEntry as CacheEntry<T>;
      }

      // Check persistent storage
      const cacheKey = generateCacheKey(key);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      const cacheEntry: CacheEntry<T> = JSON.parse(cachedData);
      
      // Check if cache is expired
      if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
        await AsyncStorage.removeItem(cacheKey);
        memoryCache.delete(key);
        return null;
      }

      // Update memory cache
      memoryCache.set(key, cacheEntry);
      return cacheEntry;
    } catch (error) {
      console.warn('Failed to get cache entry:', error);
      return null;
    }
  };

  const setCacheEntry = async <T>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        key,
      };

      const cacheKey = generateCacheKey(key);
      const serializedData = JSON.stringify(cacheEntry);
      
      // Update both memory and persistent cache
      memoryCache.set(key, cacheEntry);
      await AsyncStorage.setItem(cacheKey, serializedData);
      
      // Update cache size (approximate)
      const newSize = networkState.cacheSize + serializedData.length;
      setNetworkState(prev => ({ ...prev, cacheSize: newSize }));
      saveCacheMetadata(newSize);
      
      // Check if cache size exceeds limit and cleanup if needed
      if (newSize > MAX_CACHE_SIZE) {
        await clearExpiredCache();
      }
    } catch (error) {
      console.warn('Failed to set cache entry:', error);
    }
  };

  const cachedRequest = useCallback(async <T>(
    key: string, 
    requestFn: () => Promise<T>, 
    ttl: number = DEFAULT_TTL
  ): Promise<T> => {
    // Check if request is already in progress
    const activeRequest = activeRequests.get(key);
    if (activeRequest) {
      return activeRequest;
    }

    // Check cache first
    const cachedEntry = await getCacheEntry<T>(key);
    if (cachedEntry) {
      return cachedEntry.data;
    }

    // If offline and no cache, throw error
    if (!networkState.isOnline) {
      throw new Error('No cached data available and device is offline');
    }

    // Make request and cache result
    const requestPromise = requestFn()
      .then(async (result) => {
        await setCacheEntry(key, result, ttl);
        activeRequests.delete(key);
        return result;
      })
      .catch((error) => {
        activeRequests.delete(key);
        throw error;
      });

    activeRequests.set(key, requestPromise);
    return requestPromise;
  }, [networkState.isOnline, networkState.cacheSize]);

  const invalidateCache = useCallback(async (pattern: string) => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(CACHE_PREFIX) && key.includes(pattern)
      );
      
      await AsyncStorage.multiRemove(cacheKeys);
      
      // Clear matching memory cache entries
      for (const [key] of memoryCache) {
        if (key.includes(pattern)) {
          memoryCache.delete(key);
        }
      }
      
      // Update cache size
      const remainingKeys = await AsyncStorage.getAllKeys();
      const cacheSize = remainingKeys.filter(key => key.startsWith(CACHE_PREFIX)).length * 1024; // Rough estimate
      setNetworkState(prev => ({ ...prev, cacheSize }));
      saveCacheMetadata(cacheSize);
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }, []);

  const preloadData = useCallback(async (requests: CacheRequest[]) => {
    if (!networkState.isOnline) {
      return;
    }

    // Sort requests by priority
    const sortedRequests = [...requests].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return aPriority - bPriority;
    });

    // Process requests in batches to avoid overwhelming the network
    const batchSize = 3;
    for (let i = 0; i < sortedRequests.length; i += batchSize) {
      const batch = sortedRequests.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(request => 
          cachedRequest(request.key, request.requestFn, request.ttl)
        )
      );
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [networkState.isOnline, cachedRequest]);

  const clearExpiredCache = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      const expiredKeys: string[] = [];
      
      for (const cacheKey of cacheKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const cacheEntry: CacheEntry = JSON.parse(cachedData);
            if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
              expiredKeys.push(cacheKey);
              memoryCache.delete(cacheEntry.key);
            }
          }
        } catch (error) {
          // If we can't parse the cache entry, consider it expired
          expiredKeys.push(cacheKey);
        }
      }
      
      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        
        // Update cache size
        const remainingKeys = await AsyncStorage.getAllKeys();
        const cacheSize = remainingKeys.filter(key => key.startsWith(CACHE_PREFIX)).length * 1024;
        setNetworkState(prev => ({ ...prev, cacheSize }));
        saveCacheMetadata(cacheSize);
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  }, []);

  const clearAllCache = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      
      memoryCache.clear();
      activeRequests.clear();
      
      setNetworkState(prev => ({ ...prev, cacheSize: 0 }));
      saveCacheMetadata(0);
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }, []);

  const queueOfflineAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const updatedActions = [...networkState.pendingActions, newAction];
    
    // Limit the number of offline actions to prevent memory issues
    if (updatedActions.length > MAX_OFFLINE_ACTIONS) {
      updatedActions.splice(0, updatedActions.length - MAX_OFFLINE_ACTIONS);
    }

    setNetworkState(prev => ({ ...prev, pendingActions: updatedActions }));
    await saveOfflineActions(updatedActions);
  }, [networkState.pendingActions]);

  const removeOfflineAction = useCallback(async (actionId: string) => {
    const updatedActions = networkState.pendingActions.filter(action => action.id !== actionId);
    setNetworkState(prev => ({ ...prev, pendingActions: updatedActions }));
    await saveOfflineActions(updatedActions);
  }, [networkState.pendingActions]);

  const syncOfflineActions = useCallback(async () => {
    if (syncInProgress.current || !networkState.isOnline || networkState.pendingActions.length === 0) {
      return;
    }

    syncInProgress.current = true;
    const actionsToSync = [...networkState.pendingActions];
    const failedActions: OfflineAction[] = [];

    for (const action of actionsToSync) {
      try {
        // Attempt to execute the offline action
        // This would need to be implemented based on your app's specific actions
        console.log('Syncing offline action:', action);
        
        // Remove successful action
        await removeOfflineAction(action.id);
      } catch (error) {
        console.warn('Failed to sync offline action:', action, error);
        
        // Increment retry count
        const updatedAction = {
          ...action,
          retryCount: action.retryCount + 1,
        };
        
        // Only keep if under max retries
        if (updatedAction.retryCount < updatedAction.maxRetries) {
          failedActions.push(updatedAction);
        }
      }
    }

    // Update with failed actions for retry
    if (failedActions.length > 0) {
      setNetworkState(prev => ({ ...prev, pendingActions: failedActions }));
      await saveOfflineActions(failedActions);
    }

    setNetworkState(prev => ({ ...prev, lastSync: new Date() }));
    saveCacheMetadata(networkState.cacheSize, new Date());
    
    syncInProgress.current = false;
  }, [networkState.isOnline, networkState.pendingActions, networkState.cacheSize]);

  const getCacheInfo = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      
      return {
        keys: cacheKeys.map(key => key.replace(CACHE_PREFIX, '')),
        totalSize: networkState.cacheSize,
      };
    } catch (error) {
      console.warn('Failed to get cache info:', error);
      return { keys: [], totalSize: 0 };
    }
  }, [networkState.cacheSize]);

  const getNetworkQuality = useCallback((): 'poor' | 'good' | 'excellent' => {
    if (!networkState.isOnline) return 'poor';
    
    switch (networkState.connectionType) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        return 'good';
      case '2g':
        return 'poor';
      case '3g':
        return 'good';
      case '4g':
      case '5g':
        return 'excellent';
      default:
        return 'good';
    }
  }, [networkState.isOnline, networkState.connectionType]);

  return {
    // State
    isOnline: networkState.isOnline,
    connectionType: networkState.connectionType,
    isInternetReachable: networkState.isInternetReachable,
    pendingActions: networkState.pendingActions,
    cacheSize: networkState.cacheSize,
    lastSync: networkState.lastSync,
    
    // Cache operations
    cachedRequest,
    invalidateCache,
    preloadData,
    clearExpiredCache,
    clearAllCache,
    
    // Offline operations
    queueOfflineAction,
    syncOfflineActions,
    removeOfflineAction,
    
    // Utilities
    getCacheInfo,
    getNetworkQuality,
  };
};