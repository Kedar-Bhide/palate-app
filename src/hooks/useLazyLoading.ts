import { useState, useEffect, useCallback, useRef } from 'react';
import { Image, InteractionManager } from 'react-native';
import { lazyLoadComponent, preloadComponent } from '../lib/bundleOptimization';
import React from 'react';

export interface LazyLoadingOptions {
  preloadDelay?: number;
  maxConcurrentLoads?: number;
  priorityThreshold?: number;
  enableImagePreloading?: boolean;
  onLoadStart?: (item: string) => void;
  onLoadComplete?: (item: string, success: boolean) => void;
  onProgress?: (completed: number, total: number) => void;
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  error?: Error;
}

interface ComponentLoadInfo {
  component: React.ComponentType<any>;
  loadTime: number;
  cached: boolean;
}

interface ImageLoadInfo {
  uri: string;
  loadTime: number;
  cached: boolean;
  size?: { width: number; height: number };
}

interface UseLazyLoadingReturn {
  // Screen lazy loading
  lazyLoadScreen: (screenName: string) => Promise<React.ComponentType>;
  preloadScreens: (screenNames: string[]) => Promise<void>;
  
  // Image lazy loading
  lazyLoadImage: (src: string) => Promise<string>;
  preloadImages: (sources: string[]) => Promise<void>;
  
  // General component lazy loading
  lazyLoadComponent: <T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    componentName?: string
  ) => React.LazyExoticComponent<T>;
  
  // Preloading management
  cancelPreloading: () => void;
  clearCache: () => void;
  
  // State
  loadedComponents: Set<string>;
  preloadingComponents: Set<string>;
  preloadingImages: Set<string>;
  loadingProgress: number;
  
  // Statistics
  getLoadingStats: () => LoadingStats;
  getComponentInfo: (name: string) => ComponentLoadInfo | null;
  getImageInfo: (uri: string) => ImageLoadInfo | null;
}

interface LoadingStats {
  componentsLoaded: number;
  imagesLoaded: number;
  totalLoadTime: number;
  averageComponentLoadTime: number;
  averageImageLoadTime: number;
  cacheHitRate: number;
  currentlyLoading: number;
}

// Global state management
const loadedComponents = new Set<string>();
const preloadingComponents = new Set<string>();
const preloadingImages = new Set<string>();
const componentLoadQueue: Array<{ name: string; priority: number; importFn: () => Promise<any> }> = [];
const imageLoadQueue: Array<{ uri: string; priority: number }> = [];
const componentCache = new Map<string, ComponentLoadInfo>();
const imageCache = new Map<string, ImageLoadInfo>();
const loadingPromises = new Map<string, Promise<any>>();

// Screen import mapping - configured based on your app structure
const SCREEN_IMPORTS: Record<string, () => Promise<any>> = {
  'Home': () => import('../screens/HomeScreen'),
  'Profile': () => import('../screens/ProfileScreen'),
  'Discover': () => import('../screens/DiscoverScreen'),
  'Camera': () => import('../screens/CameraScreen'),
  'CreatePost': () => import('../screens/CreatePostScreen'),
  'Settings': () => import('../screens/SettingsScreen'),
  'NotificationCenter': () => import('../screens/NotificationCenterScreen'),
  'FriendActivity': () => import('../screens/FriendActivityScreen'),
  'FriendsList': () => import('../screens/FriendsListScreen'),
  'FriendRequests': () => import('../screens/FriendRequestsScreen'),
  'FriendSearch': () => import('../screens/FriendSearchScreen'),
  'UserProfile': () => import('../screens/UserProfileScreen'),
  'EditProfile': () => import('../screens/EditProfileScreen'),
  'MyPosts': () => import('../screens/MyPostsScreen'),
  'PostDetail': () => import('../screens/PostDetailScreen'),
  'DraftPosts': () => import('../screens/DraftPostsScreen'),
  'PhotoSelection': () => import('../screens/PhotoSelectionScreen'),
  'CuisineProgress': () => import('../screens/CuisineProgressScreen'),
  'CuisineDetail': () => import('../screens/CuisineDetailScreen'),
  'DataExport': () => import('../screens/DataExportScreen'),
};

export const useLazyLoading = (options: LazyLoadingOptions = {}): UseLazyLoadingReturn => {
  const {
    preloadDelay = 2000,
    maxConcurrentLoads = 3,
    priorityThreshold = 0.5,
    enableImagePreloading = true,
    onLoadStart,
    onLoadComplete,
    onProgress,
  } = options;

  const [loadingProgress, setLoadingProgress] = useState(0);
  const currentLoads = useRef(0);
  const cancelTokens = useRef<Set<() => void>>(new Set());
  const statsRef = useRef({
    totalComponentLoadTime: 0,
    totalImageLoadTime: 0,
    totalLoads: 0,
    cacheHits: 0,
  });

  /**
   * Lazy load a screen component
   */
  const lazyLoadScreen = useCallback(async (screenName: string): Promise<React.ComponentType> => {
    if (loadedComponents.has(screenName)) {
      const cached = componentCache.get(screenName);
      return cached!.component;
    }

    const importFn = SCREEN_IMPORTS[screenName];
    if (!importFn) {
      throw new Error(`Screen "${screenName}" not found in import mapping`);
    }

    // Check if already loading
    const existingPromise = loadingPromises.get(screenName);
    if (existingPromise) {
      return existingPromise;
    }

    const startTime = performance.now();
    preloadingComponents.add(screenName);
    onLoadStart?.(screenName);

    const loadPromise = (async () => {
      try {
        const module = await importFn();
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        const componentInfo: ComponentLoadInfo = {
          component: module.default,
          loadTime,
          cached: false,
        };

        componentCache.set(screenName, componentInfo);
        loadedComponents.add(screenName);
        preloadingComponents.delete(screenName);
        loadingPromises.delete(screenName);

        // Update stats
        statsRef.current.totalComponentLoadTime += loadTime;
        statsRef.current.totalLoads++;

        onLoadComplete?.(screenName, true);
        console.log(`Screen ${screenName} loaded in ${loadTime.toFixed(2)}ms`);

        return module.default;
      } catch (error) {
        preloadingComponents.delete(screenName);
        loadingPromises.delete(screenName);
        onLoadComplete?.(screenName, false);
        console.error(`Failed to load screen ${screenName}:`, error);
        throw error;
      }
    })();

    loadingPromises.set(screenName, loadPromise);
    return loadPromise;
  }, [onLoadStart, onLoadComplete]);

  /**
   * Preload multiple screens with priority and concurrency control
   */
  const preloadScreens = useCallback(async (screenNames: string[]): Promise<void> => {
    console.log(`Preloading ${screenNames.length} screens...`);

    // Filter out already loaded screens
    const screensToLoad = screenNames.filter(name => !loadedComponents.has(name));
    
    if (screensToLoad.length === 0) {
      console.log('All screens already loaded');
      return;
    }

    // Add to queue with priorities based on order
    screensToLoad.forEach((name, index) => {
      const priority = 1 - (index / screensToLoad.length); // Higher priority for earlier items
      componentLoadQueue.push({ name, priority, importFn: SCREEN_IMPORTS[name] });
    });

    // Sort queue by priority
    componentLoadQueue.sort((a, b) => b.priority - a.priority);

    // Process queue with concurrency control
    const loadPromises: Promise<any>[] = [];
    
    while (componentLoadQueue.length > 0 && loadPromises.length < maxConcurrentLoads) {
      const item = componentLoadQueue.shift()!;
      
      if (item.importFn) {
        const promise = lazyLoadScreen(item.name);
        loadPromises.push(promise);
      }
    }

    // Wait for current batch and continue if there are more items
    if (loadPromises.length > 0) {
      await Promise.allSettled(loadPromises);
      
      // Update progress
      const progress = (screensToLoad.length - componentLoadQueue.length) / screensToLoad.length;
      setLoadingProgress(progress);
      onProgress?.(screensToLoad.length - componentLoadQueue.length, screensToLoad.length);

      // Process remaining items
      if (componentLoadQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        await preloadScreens([]); // Recursive call to process remaining queue
      }
    }
  }, [lazyLoadScreen, maxConcurrentLoads, onProgress]);

  /**
   * Lazy load an image with caching
   */
  const lazyLoadImage = useCallback(async (src: string): Promise<string> => {
    if (imageCache.has(src)) {
      const cached = imageCache.get(src)!;
      cached.cached = true;
      statsRef.current.cacheHits++;
      return src;
    }

    const existingPromise = loadingPromises.get(`image_${src}`);
    if (existingPromise) {
      return existingPromise;
    }

    const startTime = performance.now();
    preloadingImages.add(src);
    onLoadStart?.(src);

    const loadPromise = new Promise<string>((resolve, reject) => {
      const cancelToken = () => {
        preloadingImages.delete(src);
        loadingPromises.delete(`image_${src}`);
        reject(new Error('Image loading cancelled'));
      };

      cancelTokens.current.add(cancelToken);

      // Use React Native's Image.prefetch for actual preloading
      Image.prefetch(src)
        .then(() => {
          const endTime = performance.now();
          const loadTime = endTime - startTime;

          // Get image dimensions
          Image.getSize(
            src,
            (width, height) => {
              const imageInfo: ImageLoadInfo = {
                uri: src,
                loadTime,
                cached: false,
                size: { width, height },
              };

              imageCache.set(src, imageInfo);
              preloadingImages.delete(src);
              loadingPromises.delete(`image_${src}`);
              cancelTokens.current.delete(cancelToken);

              // Update stats
              statsRef.current.totalImageLoadTime += loadTime;
              statsRef.current.totalLoads++;

              onLoadComplete?.(src, true);
              console.log(`Image loaded in ${loadTime.toFixed(2)}ms: ${src.substring(0, 50)}...`);
              resolve(src);
            },
            (error) => {
              preloadingImages.delete(src);
              loadingPromises.delete(`image_${src}`);
              cancelTokens.current.delete(cancelToken);
              onLoadComplete?.(src, false);
              console.error('Failed to get image size:', error);
              reject(error);
            }
          );
        })
        .catch((error) => {
          preloadingImages.delete(src);
          loadingPromises.delete(`image_${src}`);
          cancelTokens.current.delete(cancelToken);
          onLoadComplete?.(src, false);
          console.error('Failed to prefetch image:', error);
          reject(error);
        });
    });

    loadingPromises.set(`image_${src}`, loadPromise);
    return loadPromise;
  }, [onLoadStart, onLoadComplete]);

  /**
   * Preload multiple images with priority and concurrency control
   */
  const preloadImages = useCallback(async (sources: string[]): Promise<void> => {
    if (!enableImagePreloading) {
      console.log('Image preloading disabled');
      return;
    }

    console.log(`Preloading ${sources.length} images...`);

    // Filter out already cached images
    const imagesToLoad = sources.filter(src => !imageCache.has(src));
    
    if (imagesToLoad.length === 0) {
      console.log('All images already cached');
      return;
    }

    // Add to queue with priorities
    imagesToLoad.forEach((uri, index) => {
      const priority = 1 - (index / imagesToLoad.length);
      imageLoadQueue.push({ uri, priority });
    });

    // Sort queue by priority
    imageLoadQueue.sort((a, b) => b.priority - a.priority);

    // Process queue with concurrency control
    const batchSize = Math.min(maxConcurrentLoads, imagesToLoad.length);
    
    for (let i = 0; i < imagesToLoad.length; i += batchSize) {
      const batch = imagesToLoad.slice(i, i + batchSize);
      const batchPromises = batch.map(src => lazyLoadImage(src));
      
      await Promise.allSettled(batchPromises);
      
      // Update progress
      const progress = Math.min(1, (i + batchSize) / imagesToLoad.length);
      setLoadingProgress(progress);
      onProgress?.(Math.min(i + batchSize, imagesToLoad.length), imagesToLoad.length);

      // Brief pause between batches to avoid overwhelming the system
      if (i + batchSize < imagesToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }, [enableImagePreloading, lazyLoadImage, maxConcurrentLoads, onProgress]);

  /**
   * Create lazy component with enhanced tracking
   */
  const createLazyComponent = useCallback(<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    componentName?: string
  ): React.LazyExoticComponent<T> => {
    return lazyLoadComponent(importFn, componentName);
  }, []);

  /**
   * Cancel all preloading operations
   */
  const cancelPreloading = useCallback(() => {
    console.log('Cancelling all preloading operations...');
    
    // Cancel all active loading operations
    cancelTokens.current.forEach(cancel => {
      try {
        cancel();
      } catch (error) {
        console.error('Error cancelling load:', error);
      }
    });
    
    cancelTokens.current.clear();
    componentLoadQueue.length = 0;
    imageLoadQueue.length = 0;
    
    // Clear loading promises
    loadingPromises.clear();
    
    setLoadingProgress(0);
  }, []);

  /**
   * Clear all caches
   */
  const clearCache = useCallback(() => {
    console.log('Clearing lazy loading caches...');
    
    loadedComponents.clear();
    componentCache.clear();
    imageCache.clear();
    
    // Reset stats
    statsRef.current = {
      totalComponentLoadTime: 0,
      totalImageLoadTime: 0,
      totalLoads: 0,
      cacheHits: 0,
    };
    
    setLoadingProgress(0);
  }, []);

  /**
   * Get loading statistics
   */
  const getLoadingStats = useCallback((): LoadingStats => {
    const stats = statsRef.current;
    const componentsLoaded = componentCache.size;
    const imagesLoaded = imageCache.size;
    
    return {
      componentsLoaded,
      imagesLoaded,
      totalLoadTime: stats.totalComponentLoadTime + stats.totalImageLoadTime,
      averageComponentLoadTime: componentsLoaded > 0 ? stats.totalComponentLoadTime / componentsLoaded : 0,
      averageImageLoadTime: imagesLoaded > 0 ? stats.totalImageLoadTime / imagesLoaded : 0,
      cacheHitRate: stats.totalLoads > 0 ? (stats.cacheHits / stats.totalLoads) * 100 : 0,
      currentlyLoading: preloadingComponents.size + preloadingImages.size,
    };
  }, []);

  /**
   * Get component load information
   */
  const getComponentInfo = useCallback((name: string): ComponentLoadInfo | null => {
    return componentCache.get(name) || null;
  }, []);

  /**
   * Get image load information
   */
  const getImageInfo = useCallback((uri: string): ImageLoadInfo | null => {
    return imageCache.get(uri) || null;
  }, []);

  // Auto-preload high priority screens when the app becomes interactive
  useEffect(() => {
    const highPriorityScreens = ['Home', 'Discover', 'Profile']; // Most commonly used screens
    
    const preloadTimer = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        preloadScreens(highPriorityScreens);
      });
    }, preloadDelay);

    return () => {
      clearTimeout(preloadTimer);
    };
  }, [preloadScreens, preloadDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPreloading();
    };
  }, [cancelPreloading]);

  return {
    // Screen loading
    lazyLoadScreen,
    preloadScreens,
    
    // Image loading
    lazyLoadImage,
    preloadImages,
    
    // Component loading
    lazyLoadComponent: createLazyComponent,
    
    // Management
    cancelPreloading,
    clearCache,
    
    // State
    loadedComponents,
    preloadingComponents,
    preloadingImages,
    loadingProgress,
    
    // Statistics
    getLoadingStats,
    getComponentInfo,
    getImageInfo,
  };
};

// Utility hooks for specific use cases

/**
 * Hook for preloading images in a list or gallery
 */
export const useImagePreloader = (images: string[], enabled: boolean = true) => {
  const { preloadImages, getImageInfo, preloadingImages } = useLazyLoading({
    enableImagePreloading: enabled,
    maxConcurrentLoads: 5,
  });
  
  useEffect(() => {
    if (enabled && images.length > 0) {
      preloadImages(images);
    }
  }, [images, enabled, preloadImages]);

  const getPreloadStatus = useCallback((uri: string) => {
    const info = getImageInfo(uri);
    return {
      isLoaded: !!info,
      isLoading: preloadingImages.has(uri),
      loadTime: info?.loadTime,
      cached: info?.cached,
    };
  }, [getImageInfo, preloadingImages]);

  return { getPreloadStatus };
};

/**
 * Hook for route-based screen preloading
 */
export const useRoutePreloader = (currentRoute: string, navigationState: any) => {
  const { preloadScreens } = useLazyLoading();
  
  useEffect(() => {
    // Define preload strategies based on current route
    const preloadStrategies: Record<string, string[]> = {
      'Home': ['Discover', 'Profile', 'Camera'],
      'Discover': ['Home', 'CreatePost'],
      'Profile': ['Settings', 'FriendActivity'],
      'Camera': ['CreatePost', 'Home'],
    };

    const screensToPreload = preloadStrategies[currentRoute] || [];
    
    if (screensToPreload.length > 0) {
      // Delay preloading to not interfere with current screen rendering
      const timer = setTimeout(() => {
        preloadScreens(screensToPreload);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentRoute, preloadScreens]);
};