import { useState, useEffect, useCallback, useRef } from 'react';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

interface ImageCacheEntry {
  uri: string;
  localPath: string;
  size: number;
  lastAccessed: number;
  accessCount: number;
}

interface ImageCacheMetrics {
  totalSize: number;
  totalFiles: number;
  hitRate: number;
  avgLoadTime: number;
}

interface UseImageCacheReturn {
  cacheSize: number;
  cacheLimit: number;
  isPreloading: boolean;
  metrics: ImageCacheMetrics;
  preloadImages: (urls: string[]) => Promise<void>;
  clearImageCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  setCacheLimit: (limitMB: number) => void;
  prefetchImage: (url: string) => Promise<string | null>;
  getCacheInfo: () => Promise<ImageCacheEntry[]>;
  optimizeCache: () => Promise<void>;
  getCacheMetrics: () => Promise<ImageCacheMetrics>;
}

const CACHE_STORAGE_KEY = '@palate_image_cache';
const CACHE_DIR = `${FileSystem.cacheDirectory}images/`;
const DEFAULT_CACHE_LIMIT_MB = 100;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_CLEANUP_THRESHOLD = 0.8; // Clean when 80% full

export const useImageCache = (): UseImageCacheReturn => {
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheLimit, setCacheLimitState] = useState(DEFAULT_CACHE_LIMIT_MB);
  const [isPreloading, setIsPreloading] = useState(false);
  const [metrics, setMetrics] = useState<ImageCacheMetrics>({
    totalSize: 0,
    totalFiles: 0,
    hitRate: 0,
    avgLoadTime: 0,
  });

  const cacheMapRef = useRef<Map<string, ImageCacheEntry>>(new Map());
  const loadTimeRef = useRef<Map<string, number>>(new Map());
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);

  // Initialize cache directory and load cache map
  useEffect(() => {
    initializeCache();
    loadCacheMap();
  }, []);

  // Monitor cache size periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateCacheSize();
      updateMetrics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const initializeCache = async (): Promise<void> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      console.warn('Failed to initialize image cache directory:', error);
    }
  };

  const loadCacheMap = async (): Promise<void> => {
    try {
      const cacheData = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (cacheData) {
        const entries: ImageCacheEntry[] = JSON.parse(cacheData);
        const currentTime = Date.now();
        
        // Filter out expired entries and validate files exist
        const validEntries = await Promise.all(
          entries
            .filter(entry => currentTime - entry.lastAccessed < MAX_CACHE_AGE_MS)
            .map(async (entry) => {
              const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
              return fileInfo.exists ? entry : null;
            })
        );

        const filteredEntries = validEntries.filter(Boolean) as ImageCacheEntry[];
        
        // Rebuild cache map
        cacheMapRef.current.clear();
        filteredEntries.forEach(entry => {
          cacheMapRef.current.set(entry.uri, entry);
        });

        // Save updated cache map
        await saveCacheMap();
        await updateCacheSize();
      }
    } catch (error) {
      console.warn('Failed to load image cache map:', error);
    }
  };

  const saveCacheMap = async (): Promise<void> => {
    try {
      const entries = Array.from(cacheMapRef.current.values());
      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('Failed to save image cache map:', error);
    }
  };

  const updateCacheSize = async (): Promise<void> => {
    try {
      let totalSize = 0;
      const entries = Array.from(cacheMapRef.current.values());
      
      for (const entry of entries) {
        const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
        if (fileInfo.exists) {
          totalSize += fileInfo.size || entry.size;
        }
      }
      
      setCacheSize(Math.round(totalSize / (1024 * 1024))); // Convert to MB
    } catch (error) {
      console.warn('Failed to update cache size:', error);
    }
  };

  const updateMetrics = (): void => {
    const totalRequests = cacheHitsRef.current + cacheMissesRef.current;
    const hitRate = totalRequests > 0 ? (cacheHitsRef.current / totalRequests) * 100 : 0;
    
    const loadTimes = Array.from(loadTimeRef.current.values());
    const avgLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;

    setMetrics({
      totalSize: cacheSize,
      totalFiles: cacheMapRef.current.size,
      hitRate: Math.round(hitRate * 100) / 100,
      avgLoadTime: Math.round(avgLoadTime),
    });
  };

  const generateCacheKey = (url: string): string => {
    return url.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
  };

  const prefetchImage = useCallback(async (url: string): Promise<string | null> => {
    if (!url) return null;

    const startTime = Date.now();
    
    // Check if image is already cached
    const cacheEntry = cacheMapRef.current.get(url);
    if (cacheEntry) {
      const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
      if (fileInfo.exists) {
        // Update access statistics
        cacheEntry.lastAccessed = Date.now();
        cacheEntry.accessCount += 1;
        cacheMapRef.current.set(url, cacheEntry);
        
        cacheHitsRef.current += 1;
        loadTimeRef.current.set(url, Date.now() - startTime);
        await saveCacheMap();
        
        return cacheEntry.localPath;
      } else {
        // Remove invalid cache entry
        cacheMapRef.current.delete(url);
      }
    }

    try {
      // Download image
      cacheMissesRef.current += 1;
      const filename = generateCacheKey(url);
      const localPath = `${CACHE_DIR}${filename}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const fileSize = fileInfo.size || 0;
        
        // Create cache entry
        const newEntry: ImageCacheEntry = {
          uri: url,
          localPath,
          size: fileSize,
          lastAccessed: Date.now(),
          accessCount: 1,
        };
        
        cacheMapRef.current.set(url, newEntry);
        loadTimeRef.current.set(url, Date.now() - startTime);
        
        // Check if cache cleanup is needed
        const currentCacheSizeMB = cacheSize + (fileSize / (1024 * 1024));
        if (currentCacheSizeMB > cacheLimit * CACHE_CLEANUP_THRESHOLD) {
          await optimizeCache();
        }
        
        await saveCacheMap();
        await updateCacheSize();
        
        return localPath;
      }
    } catch (error) {
      console.warn('Failed to prefetch image:', url, error);
    }
    
    return null;
  }, [cacheSize, cacheLimit]);

  const preloadImages = useCallback(async (urls: string[]): Promise<void> => {
    if (urls.length === 0) return;
    
    setIsPreloading(true);
    
    try {
      // Process images in batches to avoid overwhelming the system
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < urls.length; i += batchSize) {
        batches.push(urls.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        const promises = batch.map(url => prefetchImage(url));
        await Promise.allSettled(promises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      setIsPreloading(false);
    }
  }, [prefetchImage]);

  const optimizeCache = useCallback(async (): Promise<void> => {
    try {
      const entries = Array.from(cacheMapRef.current.values());
      const currentTime = Date.now();
      
      // Sort by last accessed time and access count (LRU with frequency consideration)
      const sortedEntries = entries.sort((a, b) => {
        const aScore = a.lastAccessed + (a.accessCount * 24 * 60 * 60 * 1000); // Bonus for frequently accessed
        const bScore = b.lastAccessed + (b.accessCount * 24 * 60 * 60 * 1000);
        return aScore - bScore; // Oldest first
      });
      
      let totalSize = 0;
      const targetSize = cacheLimit * 1024 * 1024 * 0.7; // Target 70% of limit
      const entriesToKeep: ImageCacheEntry[] = [];
      const entriesToDelete: ImageCacheEntry[] = [];
      
      // First pass: keep entries that fit within target size (newest first)
      for (let i = sortedEntries.length - 1; i >= 0; i--) {
        const entry = sortedEntries[i];
        if (totalSize + entry.size <= targetSize) {
          totalSize += entry.size;
          entriesToKeep.push(entry);
        } else {
          entriesToDelete.push(entry);
        }
      }
      
      // Delete files and update cache map
      for (const entry of entriesToDelete) {
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
          cacheMapRef.current.delete(entry.uri);
        } catch (error) {
          console.warn('Failed to delete cached file:', entry.localPath, error);
        }
      }
      
      await saveCacheMap();
      await updateCacheSize();
      
      console.log(`Cache optimized: removed ${entriesToDelete.length} files, kept ${entriesToKeep.length}`);
    } catch (error) {
      console.warn('Failed to optimize cache:', error);
    }
  }, [cacheLimit]);

  const clearImageCache = useCallback(async (): Promise<void> => {
    try {
      // Delete all cached files
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      
      // Clear cache map
      cacheMapRef.current.clear();
      await AsyncStorage.removeItem(CACHE_STORAGE_KEY);
      
      // Reset metrics
      cacheHitsRef.current = 0;
      cacheMissesRef.current = 0;
      loadTimeRef.current.clear();
      
      setCacheSize(0);
      updateMetrics();
      
      console.log('Image cache cleared successfully');
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
    }
  }, []);

  const getCacheSize = useCallback(async (): Promise<number> => {
    await updateCacheSize();
    return cacheSize;
  }, [cacheSize]);

  const setCacheLimit = useCallback((limitMB: number): void => {
    setCacheLimitState(limitMB);
    
    // If new limit is smaller than current cache size, optimize immediately
    if (limitMB < cacheSize) {
      optimizeCache();
    }
  }, [cacheSize, optimizeCache]);

  const getCacheInfo = useCallback(async (): Promise<ImageCacheEntry[]> => {
    return Array.from(cacheMapRef.current.values());
  }, []);

  const getCacheMetrics = useCallback(async (): Promise<ImageCacheMetrics> => {
    updateMetrics();
    return metrics;
  }, [metrics]);

  return {
    cacheSize,
    cacheLimit,
    isPreloading,
    metrics,
    preloadImages,
    clearImageCache,
    getCacheSize,
    setCacheLimit,
    prefetchImage,
    getCacheInfo,
    optimizeCache,
    getCacheMetrics,
  };
};