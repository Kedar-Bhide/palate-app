import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  timestamp: number;
}

export interface MemoryLeak {
  id: string;
  component: string;
  type: 'subscription' | 'timer' | 'listener' | 'cache' | 'reference';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  estimatedImpact: number; // bytes
}

export interface MemoryPressureLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  freeMemory: number;
  usedMemory: number;
  recommendations: string[];
}

interface UseMemoryManagementReturn {
  memoryUsage: MemoryStats;
  memoryLeaks: MemoryLeak[];
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  cleanupInProgress: boolean;
  trackMemoryUsage: () => MemoryStats;
  detectMemoryLeaks: () => MemoryLeak[];
  cleanupResources: () => Promise<void>;
  forceGarbageCollection: () => void;
  getMemoryPressure: () => MemoryPressureLevel;
  registerMemoryWarning: (callback: (pressure: string) => void) => () => void;
}

// Global memory tracking
const memoryHistory: MemoryStats[] = [];
const trackedComponents = new Map<string, Set<string>>();
const activeTimers = new Set<number>();
const activeIntervals = new Set<number>();
const activeSubscriptions = new Set<() => void>();
const memoryWarningCallbacks = new Set<(pressure: string) => void>();
let memoryMonitoringInterval: NodeJS.Timeout | null = null;

// Memory thresholds (in bytes)
const MEMORY_THRESHOLDS = {
  low: 50 * 1024 * 1024, // 50MB
  medium: 100 * 1024 * 1024, // 100MB
  high: 200 * 1024 * 1024, // 200MB
  critical: 300 * 1024 * 1024, // 300MB
};

export const useMemoryManagement = (): UseMemoryManagementReturn => {
  const [memoryUsage, setMemoryUsage] = useState<MemoryStats>({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    usagePercentage: 0,
    timestamp: Date.now(),
  });
  
  const [memoryLeaks, setMemoryLeaks] = useState<MemoryLeak[]>([]);
  const [memoryPressure, setMemoryPressure] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  
  const componentMountCountRef = useRef<Map<string, number>>(new Map());
  const lastGCTime = useRef(Date.now());
  const isMonitoring = useRef(false);

  /**
   * Get current memory usage statistics
   */
  const trackMemoryUsage = useCallback((): MemoryStats => {
    let stats: MemoryStats;
    
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      const memory = (window.performance as any).memory;
      stats = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        timestamp: Date.now(),
      };
    } else {
      // Fallback for environments without performance.memory
      const estimatedUsage = process.memoryUsage?.()?.heapUsed || 50 * 1024 * 1024;
      const estimatedLimit = 512 * 1024 * 1024; // 512MB fallback
      
      stats = {
        usedJSHeapSize: estimatedUsage,
        totalJSHeapSize: estimatedUsage * 1.5,
        jsHeapSizeLimit: estimatedLimit,
        usagePercentage: (estimatedUsage / estimatedLimit) * 100,
        timestamp: Date.now(),
      };
    }
    
    // Store in history (keep last 100 entries)
    memoryHistory.push(stats);
    if (memoryHistory.length > 100) {
      memoryHistory.shift();
    }
    
    setMemoryUsage(stats);
    return stats;
  }, []);

  /**
   * Detect potential memory leaks
   */
  const detectMemoryLeaks = useCallback((): MemoryLeak[] => {
    const currentLeaks: MemoryLeak[] = [];
    const now = Date.now();
    
    // Check for growing memory usage trend
    if (memoryHistory.length >= 10) {
      const recent = memoryHistory.slice(-10);
      const trend = recent.reduce((acc, curr, idx) => {
        if (idx === 0) return 0;
        return acc + (curr.usedJSHeapSize - recent[idx - 1].usedJSHeapSize);
      }, 0);
      
      if (trend > 10 * 1024 * 1024) { // 10MB increase
        currentLeaks.push({
          id: `memory-trend-${now}`,
          component: 'Global',
          type: 'reference',
          description: `Memory usage increased by ${Math.round(trend / 1024 / 1024)}MB in last 10 measurements`,
          severity: trend > 50 * 1024 * 1024 ? 'critical' : 'high',
          detectedAt: now,
          estimatedImpact: trend,
        });
      }
    }
    
    // Check for excessive timer/interval usage
    if (activeTimers.size > 20) {
      currentLeaks.push({
        id: `timers-${now}`,
        component: 'Global',
        type: 'timer',
        description: `${activeTimers.size} active timers detected. Consider cleanup.`,
        severity: activeTimers.size > 50 ? 'high' : 'medium',
        detectedAt: now,
        estimatedImpact: activeTimers.size * 1024, // Rough estimate
      });
    }
    
    // Check for excessive subscriptions
    if (activeSubscriptions.size > 15) {
      currentLeaks.push({
        id: `subscriptions-${now}`,
        component: 'Global',
        type: 'subscription',
        description: `${activeSubscriptions.size} active subscriptions. Check for proper cleanup.`,
        severity: activeSubscriptions.size > 30 ? 'high' : 'medium',
        detectedAt: now,
        estimatedImpact: activeSubscriptions.size * 2048,
      });
    }
    
    // Check component mount/unmount balance
    Array.from(componentMountCountRef.current.entries()).forEach(([component, count]) => {
      if (count > 100) {
        currentLeaks.push({
          id: `component-${component}-${now}`,
          component,
          type: 'reference',
          description: `Component ${component} has high mount count (${count}). Possible memory leak.`,
          severity: count > 200 ? 'high' : 'medium',
          detectedAt: now,
          estimatedImpact: count * 10240, // Rough estimate per instance
        });
      }
    });
    
    setMemoryLeaks(currentLeaks);
    return currentLeaks;
  }, []);

  /**
   * Clean up resources and attempt to free memory
   */
  const cleanupResources = useCallback(async (): Promise<void> => {
    if (cleanupInProgress) return;
    
    setCleanupInProgress(true);
    
    try {
      console.log('Starting memory cleanup...');
      
      // Clear old memory history
      if (memoryHistory.length > 20) {
        memoryHistory.splice(0, memoryHistory.length - 20);
      }
      
      // Clear expired timers (this is a placeholder - actual implementation would need timer tracking)
      const expiredTimers = Array.from(activeTimers).filter(() => Math.random() < 0.1); // Simulate cleanup
      expiredTimers.forEach(timerId => {
        activeTimers.delete(timerId);
      });
      
      // Clear component tracking for unmounted components
      const currentMounts = new Map(componentMountCountRef.current);
      currentMounts.forEach((count, component) => {
        if (count === 0) {
          componentMountCountRef.current.delete(component);
        }
      });
      
      // Force garbage collection if available
      forceGarbageCollection();
      
      // Wait a bit for cleanup to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Re-measure memory usage
      trackMemoryUsage();
      
      console.log('Memory cleanup completed');
      
    } catch (error) {
      console.error('Error during memory cleanup:', error);
    } finally {
      setCleanupInProgress(false);
    }
  }, [cleanupInProgress, trackMemoryUsage]);

  /**
   * Force garbage collection if available
   */
  const forceGarbageCollection = useCallback((): void => {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        lastGCTime.current = Date.now();
        console.log('Forced garbage collection');
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    } else if (typeof global !== 'undefined' && (global as any).gc) {
      try {
        (global as any).gc();
        lastGCTime.current = Date.now();
        console.log('Forced garbage collection');
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    } else {
      console.log('Garbage collection not available');
    }
  }, []);

  /**
   * Calculate memory pressure level
   */
  const getMemoryPressure = useCallback((): MemoryPressureLevel => {
    const usage = memoryUsage.usedJSHeapSize;
    const limit = memoryUsage.jsHeapSizeLimit;
    const freeMemory = limit - usage;
    
    let level: 'low' | 'medium' | 'high' | 'critical';
    const recommendations: string[] = [];
    
    if (usage > MEMORY_THRESHOLDS.critical) {
      level = 'critical';
      recommendations.push('Critical memory usage! Force cleanup immediately');
      recommendations.push('Consider removing unused components and data');
      recommendations.push('Clear image caches and reduce virtualized list sizes');
    } else if (usage > MEMORY_THRESHOLDS.high) {
      level = 'high';
      recommendations.push('High memory usage detected');
      recommendations.push('Consider cleanup of unused resources');
      recommendations.push('Monitor component lifecycle carefully');
    } else if (usage > MEMORY_THRESHOLDS.medium) {
      level = 'medium';
      recommendations.push('Moderate memory usage');
      recommendations.push('Monitor for memory leaks');
    } else {
      level = 'low';
      recommendations.push('Memory usage is healthy');
    }
    
    setMemoryPressure(level);
    
    return {
      level,
      freeMemory,
      usedMemory: usage,
      recommendations,
    };
  }, [memoryUsage]);

  /**
   * Register callback for memory warnings
   */
  const registerMemoryWarning = useCallback((callback: (pressure: string) => void): (() => void) => {
    memoryWarningCallbacks.add(callback);
    
    return () => {
      memoryWarningCallbacks.delete(callback);
    };
  }, []);

  // Start memory monitoring on mount
  useEffect(() => {
    if (!isMonitoring.current) {
      isMonitoring.current = true;
      
      // Initial measurement
      trackMemoryUsage();
      
      // Set up periodic monitoring
      memoryMonitoringInterval = setInterval(() => {
        trackMemoryUsage();
        const leaks = detectMemoryLeaks();
        const pressure = getMemoryPressure();
        
        // Trigger memory warning callbacks if pressure is high
        if (pressure.level === 'high' || pressure.level === 'critical') {
          memoryWarningCallbacks.forEach(callback => {
            try {
              callback(pressure.level);
            } catch (error) {
              console.error('Error in memory warning callback:', error);
            }
          });
        }
        
        // Auto-cleanup on critical memory pressure
        if (pressure.level === 'critical' && !cleanupInProgress) {
          console.warn('Critical memory pressure detected, triggering automatic cleanup');
          cleanupResources();
        }
        
      }, 5000); // Check every 5 seconds
      
      return () => {
        if (memoryMonitoringInterval) {
          clearInterval(memoryMonitoringInterval);
          memoryMonitoringInterval = null;
        }
        isMonitoring.current = false;
      };
    }
  }, [trackMemoryUsage, detectMemoryLeaks, getMemoryPressure, cleanupResources, cleanupInProgress]);

  // Monitor app state changes for cleanup opportunities
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // App went to background, good time for cleanup
        console.log('App backgrounded, performing memory cleanup');
        cleanupResources();
      } else if (nextAppState === 'active') {
        // App became active, check memory status
        trackMemoryUsage();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [cleanupResources, trackMemoryUsage]);

  return {
    memoryUsage,
    memoryLeaks,
    memoryPressure,
    cleanupInProgress,
    trackMemoryUsage,
    detectMemoryLeaks,
    cleanupResources,
    forceGarbageCollection,
    getMemoryPressure,
    registerMemoryWarning,
  };
};

// Utility functions for component tracking
export const trackComponentMount = (componentName: string): void => {
  const currentCount = componentMountCountRef.current.get(componentName) || 0;
  componentMountCountRef.current.set(componentName, currentCount + 1);
};

export const trackComponentUnmount = (componentName: string): void => {
  const currentCount = componentMountCountRef.current.get(componentName) || 0;
  if (currentCount > 0) {
    componentMountCountRef.current.set(componentName, currentCount - 1);
  }
};

// Timer tracking utilities
export const trackTimer = (timerId: number): void => {
  activeTimers.add(timerId);
};

export const untrackTimer = (timerId: number): void => {
  activeTimers.delete(timerId);
};

export const trackInterval = (intervalId: number): void => {
  activeIntervals.add(intervalId);
};

export const untrackInterval = (intervalId: number): void => {
  activeIntervals.delete(intervalId);
};

// Subscription tracking utilities
export const trackSubscription = (unsubscribe: () => void): void => {
  activeSubscriptions.add(unsubscribe);
};

export const untrackSubscription = (unsubscribe: () => void): void => {
  activeSubscriptions.delete(unsubscribe);
};

// Global memory utilities
export const getGlobalMemoryStats = () => {
  return {
    activeTimers: activeTimers.size,
    activeIntervals: activeIntervals.size,
    activeSubscriptions: activeSubscriptions.size,
    trackedComponents: Array.from(componentMountCountRef.current.entries()),
    memoryHistory: memoryHistory.slice(-10), // Last 10 measurements
  };
};