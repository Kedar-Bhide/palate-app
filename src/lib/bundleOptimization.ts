import React from 'react';

export interface BundleAnalysis {
  totalSize: number;
  chunkSizes: Record<string, number>;
  unusedImports: string[];
  heaviestModules: Array<{
    name: string;
    size: number;
    percentage: number;
  }>;
  recommendations: string[];
}

export interface OptimizedImports {
  originalImports: string[];
  optimizedImports: string[];
  savings: number;
  suggestions: string[];
}

export interface ComponentLoadingStats {
  name: string;
  loadTime: number;
  size?: number;
  cached: boolean;
  timestamp: number;
}

// Global bundle tracking
const bundleUsage = new Map<string, number>();
const componentLoadTimes = new Map<string, ComponentLoadingStats>();
const preloadedComponents = new Set<string>();
const loadingComponents = new Set<string>();

/**
 * Create a lazy loaded component with enhanced error handling and preloading
 */
export const lazyLoadComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName?: string
): React.LazyExoticComponent<T> => {
  const LazyComponent = React.lazy(async () => {
    const startTime = performance.now();
    const name = componentName || 'UnknownComponent';
    
    try {
      loadingComponents.add(name);
      
      const result = await importFn();
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Track loading stats
      componentLoadTimes.set(name, {
        name,
        loadTime,
        cached: preloadedComponents.has(name),
        timestamp: Date.now(),
      });
      
      // Track usage
      trackBundleUsage(name);
      
      console.log(`Component ${name} loaded in ${loadTime.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      console.error(`Failed to load component ${name}:`, error);
      
      // Return fallback component
      return {
        default: (() => {
          throw error;
        }) as T,
      };
    } finally {
      loadingComponents.delete(name);
    }
  });
  
  LazyComponent.displayName = componentName ? `Lazy(${componentName})` : 'LazyComponent';
  
  return LazyComponent;
};

/**
 * Preload a component to improve perceived performance
 */
export const preloadComponent = async (
  importFn: () => Promise<any>,
  componentName?: string
): Promise<void> => {
  const name = componentName || 'UnknownComponent';
  
  if (preloadedComponents.has(name) || loadingComponents.has(name)) {
    return;
  }
  
  try {
    loadingComponents.add(name);
    const startTime = performance.now();
    
    await importFn();
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    preloadedComponents.add(name);
    
    componentLoadTimes.set(name, {
      name,
      loadTime,
      cached: false,
      timestamp: Date.now(),
    });
    
    console.log(`Component ${name} preloaded in ${loadTime.toFixed(2)}ms`);
  } catch (error) {
    console.warn(`Failed to preload component ${name}:`, error);
  } finally {
    loadingComponents.delete(name);
  }
};

/**
 * Analyze current bundle size and usage patterns
 */
export const analyzeBundleSize = (): BundleAnalysis => {
  // In a real implementation, this would integrate with webpack-bundle-analyzer
  // or similar tools. For now, we'll provide estimates based on tracked usage.
  
  const totalComponents = componentLoadTimes.size;
  const heaviestModules: Array<{ name: string; size: number; percentage: number }> = [];
  
  // Generate estimated bundle analysis
  Array.from(componentLoadTimes.entries()).forEach(([name, stats]) => {
    const estimatedSize = Math.round(stats.loadTime * 10); // Rough estimate
    heaviestModules.push({
      name,
      size: estimatedSize,
      percentage: 0, // Would be calculated from actual bundle data
    });
  });
  
  // Sort by estimated size
  heaviestModules.sort((a, b) => b.size - a.size);
  
  const recommendations = generateOptimizationRecommendations(heaviestModules);
  
  return {
    totalSize: heaviestModules.reduce((sum, module) => sum + module.size, 0),
    chunkSizes: heaviestModules.reduce((acc, module) => {
      acc[module.name] = module.size;
      return acc;
    }, {} as Record<string, number>),
    unusedImports: findUnusedImports(),
    heaviestModules: heaviestModules.slice(0, 10),
    recommendations,
  };
};

/**
 * Optimize imports for better tree shaking
 */
export const optimizeImports = (modulePath: string): OptimizedImports => {
  const commonOptimizations: Record<string, { from: string; to: string; savings: number }> = {
    lodash: {
      from: "import _ from 'lodash'",
      to: "import { map, filter } from 'lodash'",
      savings: 50000, // Approximate savings in bytes
    },
    'react-native-vector-icons': {
      from: "import Icon from 'react-native-vector-icons/MaterialIcons'",
      to: "import MaterialIcons from 'react-native-vector-icons/MaterialIcons'",
      savings: 20000,
    },
    '@expo/vector-icons': {
      from: "import * as Icons from '@expo/vector-icons'",
      to: "import { MaterialIcons } from '@expo/vector-icons'",
      savings: 15000,
    },
  };
  
  const optimization = commonOptimizations[modulePath];
  
  if (optimization) {
    return {
      originalImports: [optimization.from],
      optimizedImports: [optimization.to],
      savings: optimization.savings,
      suggestions: [
        `Use named imports instead of default imports for ${modulePath}`,
        `This can reduce bundle size by ~${(optimization.savings / 1000).toFixed(1)}KB`,
      ],
    };
  }
  
  return {
    originalImports: [],
    optimizedImports: [],
    savings: 0,
    suggestions: [`No specific optimizations available for ${modulePath}`],
  };
};

/**
 * Track bundle usage for analytics
 */
export const trackBundleUsage = (componentName: string): void => {
  const currentUsage = bundleUsage.get(componentName) || 0;
  bundleUsage.set(componentName, currentUsage + 1);
  
  // Log usage patterns in development
  if (__DEV__) {
    console.log(`Bundle usage: ${componentName} used ${currentUsage + 1} times`);
  }
};

/**
 * Get bundle usage statistics
 */
export const getBundleUsageStats = () => {
  const stats = Array.from(bundleUsage.entries()).map(([name, count]) => ({
    component: name,
    usageCount: count,
    loadStats: componentLoadTimes.get(name),
  }));
  
  return {
    totalComponents: stats.length,
    mostUsed: stats.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10),
    leastUsed: stats.sort((a, b) => a.usageCount - b.usageCount).slice(0, 10),
    preloadedComponents: Array.from(preloadedComponents),
    currentlyLoading: Array.from(loadingComponents),
  };
};

/**
 * Preload critical components based on user navigation patterns
 */
export const preloadCriticalComponents = async (routes: string[]): Promise<void> => {
  const criticalRoutes = routes.slice(0, 3); // Preload only top 3 most likely routes
  
  const preloadPromises = criticalRoutes.map(async (route) => {
    try {
      // This would map to actual component imports based on routing
      const importMap: Record<string, () => Promise<any>> = {
        'Home': () => import('../screens/HomeScreen'),
        'Profile': () => import('../screens/ProfileScreen'),
        'Discover': () => import('../screens/DiscoverScreen'),
        'Camera': () => import('../screens/CameraScreen'),
        'CreatePost': () => import('../screens/CreatePostScreen'),
      };
      
      const importFn = importMap[route];
      if (importFn) {
        await preloadComponent(importFn, route);
      }
    } catch (error) {
      console.warn(`Failed to preload route ${route}:`, error);
    }
  });
  
  await Promise.allSettled(preloadPromises);
};

/**
 * Dynamic import with retry logic
 */
export const dynamicImport = async <T>(
  importFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < retries - 1) {
        console.warn(`Dynamic import failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};

/**
 * Monitor and optimize bundle performance
 */
export class BundlePerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private thresholds = {
    slowLoadTime: 1000, // 1 second
    heavyComponent: 50000, // 50KB estimated
  };
  
  recordLoadTime(componentName: string, loadTime: number) {
    const times = this.metrics.get(componentName) || [];
    times.push(loadTime);
    
    // Keep only last 10 measurements
    if (times.length > 10) {
      times.shift();
    }
    
    this.metrics.set(componentName, times);
    
    // Check for performance issues
    if (loadTime > this.thresholds.slowLoadTime) {
      console.warn(`Slow loading component detected: ${componentName} (${loadTime}ms)`);
    }
  }
  
  getAverageLoadTime(componentName: string): number {
    const times = this.metrics.get(componentName);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  getPerformanceReport() {
    const report = Array.from(this.metrics.entries()).map(([name, times]) => ({
      component: name,
      averageLoadTime: this.getAverageLoadTime(name),
      minLoadTime: Math.min(...times),
      maxLoadTime: Math.max(...times),
      loadCount: times.length,
      isSlow: this.getAverageLoadTime(name) > this.thresholds.slowLoadTime,
    }));
    
    return {
      components: report.sort((a, b) => b.averageLoadTime - a.averageLoadTime),
      slowComponents: report.filter(c => c.isSlow),
      totalComponents: report.length,
      averageGlobalLoadTime: report.reduce((sum, c) => sum + c.averageLoadTime, 0) / report.length,
    };
  }
}

// Global bundle monitor instance
export const bundleMonitor = new BundlePerformanceMonitor();

/**
 * Find potentially unused imports (simplified implementation)
 */
function findUnusedImports(): string[] {
  const lowUsageComponents = Array.from(bundleUsage.entries())
    .filter(([_, count]) => count <= 1)
    .map(([name]) => name);
  
  return lowUsageComponents;
}

/**
 * Generate optimization recommendations based on bundle analysis
 */
function generateOptimizationRecommendations(heaviestModules: Array<{ name: string; size: number }>): string[] {
  const recommendations: string[] = [];
  
  if (heaviestModules.length > 0) {
    const heaviest = heaviestModules[0];
    if (heaviest.size > 30000) {
      recommendations.push(`Consider code splitting for ${heaviest.name} (estimated ${Math.round(heaviest.size / 1000)}KB)`);
    }
  }
  
  const totalUnused = findUnusedImports().length;
  if (totalUnused > 0) {
    recommendations.push(`Remove ${totalUnused} unused components to reduce bundle size`);
  }
  
  if (preloadedComponents.size < 3) {
    recommendations.push('Consider preloading more critical components for better perceived performance');
  }
  
  const avgLoadTime = Array.from(componentLoadTimes.values())
    .reduce((sum, stats) => sum + stats.loadTime, 0) / componentLoadTimes.size;
  
  if (avgLoadTime > 500) {
    recommendations.push(`Average component load time is ${avgLoadTime.toFixed(0)}ms. Consider optimizing imports and bundle splitting.`);
  }
  
  return recommendations;
}

/**
 * Clean up bundle tracking data
 */
export const cleanupBundleData = (): void => {
  bundleUsage.clear();
  componentLoadTimes.clear();
  preloadedComponents.clear();
  loadingComponents.clear();
  
  console.log('Bundle tracking data cleaned up');
};

/**
 * Export bundle data for analysis
 */
export const exportBundleData = () => {
  return {
    usage: Object.fromEntries(bundleUsage),
    loadTimes: Object.fromEntries(componentLoadTimes),
    preloaded: Array.from(preloadedComponents),
    currentlyLoading: Array.from(loadingComponents),
    performanceReport: bundleMonitor.getPerformanceReport(),
  };
};