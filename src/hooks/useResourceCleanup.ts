import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { trackTimer, untrackTimer, trackInterval, untrackInterval, trackSubscription, untrackSubscription } from './useMemoryManagement';

export interface CleanupableResource {
  id: string;
  type: 'timer' | 'interval' | 'subscription' | 'listener' | 'animation' | 'cache' | 'custom';
  cleanup: () => void;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface ResourceCleanupOptions {
  autoCleanupOnUnmount?: boolean;
  autoCleanupOnBackground?: boolean;
  maxResourceAge?: number; // milliseconds
  cleanupInterval?: number; // milliseconds
  onCleanup?: (resource: CleanupableResource) => void;
}

interface UseResourceCleanupReturn {
  addCleanupTask: (task: () => void, id?: string, type?: CleanupableResource['type']) => string;
  removeCleanupTask: (taskId: string) => void;
  cleanupAllResources: () => void;
  trackResource: (resource: Omit<CleanupableResource, 'id' | 'createdAt'>) => string;
  scheduleCleanup: (delay: number, task: () => void) => string;
  activeResources: Set<string>;
  cleanupTasks: Map<string, CleanupableResource>;
  autoCleanupEnabled: boolean;
  // Enhanced cleanup methods
  cleanupByType: (type: CleanupableResource['type']) => void;
  cleanupExpiredResources: () => void;
  getResourceStats: () => ResourceStats;
  forceCleanup: (resourceIds: string[]) => void;
}

interface ResourceStats {
  totalResources: number;
  resourcesByType: Record<CleanupableResource['type'], number>;
  oldestResource?: CleanupableResource;
  memoryEstimate: number;
  cleanupHistory: Array<{
    timestamp: number;
    type: string;
    count: number;
  }>;
}

let globalResourceIdCounter = 0;

export const useResourceCleanup = (options: ResourceCleanupOptions = {}): UseResourceCleanupReturn => {
  const {
    autoCleanupOnUnmount = true,
    autoCleanupOnBackground = true,
    maxResourceAge = 5 * 60 * 1000, // 5 minutes
    cleanupInterval = 30 * 1000, // 30 seconds
    onCleanup,
  } = options;

  const cleanupTasks = useRef<Map<string, CleanupableResource>>(new Map());
  const activeResources = useRef<Set<string>>(new Set());
  const cleanupHistory = useRef<Array<{ timestamp: number; type: string; count: number }>>([]);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCleanupEnabled = useRef(true);

  const generateResourceId = useCallback((): string => {
    globalResourceIdCounter += 1;
    return `resource_${Date.now()}_${globalResourceIdCounter}`;
  }, []);

  /**
   * Add a cleanup task with automatic tracking
   */
  const addCleanupTask = useCallback((
    task: () => void,
    id?: string,
    type: CleanupableResource['type'] = 'custom'
  ): string => {
    const resourceId = id || generateResourceId();
    
    const resource: CleanupableResource = {
      id: resourceId,
      type,
      cleanup: task,
      priority: 'medium',
      createdAt: Date.now(),
    };

    cleanupTasks.current.set(resourceId, resource);
    activeResources.current.add(resourceId);

    // Track specific resource types for memory management
    if (type === 'timer') {
      trackTimer(Date.now()); // Using timestamp as timer ID for tracking
    } else if (type === 'interval') {
      trackInterval(Date.now());
    } else if (type === 'subscription') {
      trackSubscription(task);
    }

    console.log(`Resource tracked: ${resourceId} (${type})`);
    return resourceId;
  }, [generateResourceId]);

  /**
   * Remove a specific cleanup task
   */
  const removeCleanupTask = useCallback((taskId: string): void => {
    const resource = cleanupTasks.current.get(taskId);
    if (resource) {
      try {
        resource.cleanup();
        
        // Untrack specific resource types
        if (resource.type === 'timer') {
          untrackTimer(Date.now());
        } else if (resource.type === 'interval') {
          untrackInterval(Date.now());
        } else if (resource.type === 'subscription') {
          untrackSubscription(resource.cleanup);
        }

        cleanupTasks.current.delete(taskId);
        activeResources.current.delete(taskId);
        
        onCleanup?.(resource);
        console.log(`Resource cleaned up: ${taskId} (${resource.type})`);
      } catch (error) {
        console.error(`Error cleaning up resource ${taskId}:`, error);
      }
    }
  }, [onCleanup]);

  /**
   * Clean up all resources
   */
  const cleanupAllResources = useCallback((): void => {
    const resourceCount = cleanupTasks.current.size;
    const startTime = Date.now();

    console.log(`Starting cleanup of ${resourceCount} resources...`);

    // Group resources by priority for ordered cleanup
    const resourcesByPriority: Record<string, CleanupableResource[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    Array.from(cleanupTasks.current.values()).forEach(resource => {
      const priority = resource.priority || 'medium';
      resourcesByPriority[priority].push(resource);
    });

    // Clean up in priority order
    const priorities: Array<keyof typeof resourcesByPriority> = ['critical', 'high', 'medium', 'low'];
    let cleanedCount = 0;

    priorities.forEach(priority => {
      resourcesByPriority[priority].forEach(resource => {
        try {
          resource.cleanup();
          cleanedCount++;
          
          // Untrack specific resource types
          if (resource.type === 'timer') {
            untrackTimer(Date.now());
          } else if (resource.type === 'interval') {
            untrackInterval(Date.now());
          } else if (resource.type === 'subscription') {
            untrackSubscription(resource.cleanup);
          }

          onCleanup?.(resource);
        } catch (error) {
          console.error(`Error cleaning up resource ${resource.id}:`, error);
        }
      });
    });

    cleanupTasks.current.clear();
    activeResources.current.clear();

    const endTime = Date.now();
    const cleanupDuration = endTime - startTime;

    // Record cleanup history
    cleanupHistory.current.push({
      timestamp: startTime,
      type: 'all',
      count: cleanedCount,
    });

    // Keep only last 20 cleanup events
    if (cleanupHistory.current.length > 20) {
      cleanupHistory.current.shift();
    }

    console.log(`Cleaned up ${cleanedCount}/${resourceCount} resources in ${cleanupDuration}ms`);
  }, [onCleanup]);

  /**
   * Track a resource with custom cleanup logic
   */
  const trackResource = useCallback((
    resource: Omit<CleanupableResource, 'id' | 'createdAt'>
  ): string => {
    const id = generateResourceId();
    const trackedResource: CleanupableResource = {
      ...resource,
      id,
      createdAt: Date.now(),
    };

    cleanupTasks.current.set(id, trackedResource);
    activeResources.current.add(id);

    return id;
  }, [generateResourceId]);

  /**
   * Schedule a cleanup task to run after a delay
   */
  const scheduleCleanup = useCallback((delay: number, task: () => void): string => {
    const timeoutId = setTimeout(() => {
      try {
        task();
      } catch (error) {
        console.error('Error in scheduled cleanup:', error);
      }
    }, delay);

    return addCleanupTask(
      () => clearTimeout(timeoutId),
      `scheduled_${timeoutId}`,
      'timer'
    );
  }, [addCleanupTask]);

  /**
   * Clean up resources by type
   */
  const cleanupByType = useCallback((type: CleanupableResource['type']): void => {
    const resourcesOfType = Array.from(cleanupTasks.current.values())
      .filter(resource => resource.type === type);

    console.log(`Cleaning up ${resourcesOfType.length} resources of type: ${type}`);

    resourcesOfType.forEach(resource => {
      removeCleanupTask(resource.id);
    });

    // Record cleanup history
    cleanupHistory.current.push({
      timestamp: Date.now(),
      type,
      count: resourcesOfType.length,
    });
  }, [removeCleanupTask]);

  /**
   * Clean up expired resources based on age
   */
  const cleanupExpiredResources = useCallback((): void => {
    const now = Date.now();
    const expiredResources = Array.from(cleanupTasks.current.values())
      .filter(resource => now - resource.createdAt > maxResourceAge);

    console.log(`Cleaning up ${expiredResources.length} expired resources`);

    expiredResources.forEach(resource => {
      removeCleanupTask(resource.id);
    });

    if (expiredResources.length > 0) {
      cleanupHistory.current.push({
        timestamp: now,
        type: 'expired',
        count: expiredResources.length,
      });
    }
  }, [maxResourceAge, removeCleanupTask]);

  /**
   * Get resource statistics
   */
  const getResourceStats = useCallback((): ResourceStats => {
    const resources = Array.from(cleanupTasks.current.values());
    const resourcesByType = resources.reduce((acc, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + 1;
      return acc;
    }, {} as Record<CleanupableResource['type'], number>);

    const oldestResource = resources.reduce((oldest, current) => {
      return !oldest || current.createdAt < oldest.createdAt ? current : oldest;
    }, undefined as CleanupableResource | undefined);

    // Rough memory estimate based on resource types
    const memoryEstimate = resources.reduce((total, resource) => {
      const typeEstimates: Record<CleanupableResource['type'], number> = {
        timer: 100, // bytes
        interval: 150,
        subscription: 200,
        listener: 300,
        animation: 500,
        cache: 1000,
        custom: 100,
      };
      return total + (typeEstimates[resource.type] || 100);
    }, 0);

    return {
      totalResources: resources.length,
      resourcesByType,
      oldestResource,
      memoryEstimate,
      cleanupHistory: [...cleanupHistory.current],
    };
  }, []);

  /**
   * Force cleanup of specific resources
   */
  const forceCleanup = useCallback((resourceIds: string[]): void => {
    console.log(`Force cleaning up ${resourceIds.length} resources`);

    resourceIds.forEach(id => {
      removeCleanupTask(id);
    });

    cleanupHistory.current.push({
      timestamp: Date.now(),
      type: 'forced',
      count: resourceIds.length,
    });
  }, [removeCleanupTask]);

  // Set up periodic cleanup of expired resources
  useEffect(() => {
    if (autoCleanupEnabled.current) {
      cleanupIntervalRef.current = setInterval(() => {
        cleanupExpiredResources();
      }, cleanupInterval);

      return () => {
        if (cleanupIntervalRef.current) {
          clearInterval(cleanupIntervalRef.current);
        }
      };
    }
  }, [cleanupExpiredResources, cleanupInterval]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && autoCleanupOnBackground) {
        console.log('App backgrounded, performing resource cleanup');
        cleanupExpiredResources();
      } else if (nextAppState === 'inactive') {
        // App is transitioning, good time for light cleanup
        const stats = getResourceStats();
        if (stats.totalResources > 50) {
          console.log('App inactive with many resources, cleaning expired ones');
          cleanupExpiredResources();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [autoCleanupOnBackground, cleanupExpiredResources, getResourceStats]);

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      if (autoCleanupOnUnmount) {
        console.log('Component unmounting, cleaning up all resources');
        cleanupAllResources();
      }
    };
  }, [autoCleanupOnUnmount, cleanupAllResources]);

  return {
    addCleanupTask,
    removeCleanupTask,
    cleanupAllResources,
    trackResource,
    scheduleCleanup,
    activeResources: activeResources.current,
    cleanupTasks: cleanupTasks.current,
    autoCleanupEnabled: autoCleanupEnabled.current,
    cleanupByType,
    cleanupExpiredResources,
    getResourceStats,
    forceCleanup,
  };
};

// Utility hooks for common cleanup patterns

/**
 * Hook for managing timers with automatic cleanup
 */
export const useTimer = () => {
  const { addCleanupTask } = useResourceCleanup();

  const setTimeout = useCallback((callback: () => void, delay: number): string => {
    const timeoutId = window.setTimeout(callback, delay);
    return addCleanupTask(() => clearTimeout(timeoutId), `timer_${timeoutId}`, 'timer');
  }, [addCleanupTask]);

  const setInterval = useCallback((callback: () => void, delay: number): string => {
    const intervalId = window.setInterval(callback, delay);
    return addCleanupTask(() => clearInterval(intervalId), `interval_${intervalId}`, 'interval');
  }, [addCleanupTask]);

  return { setTimeout, setInterval };
};

/**
 * Hook for managing event listeners with automatic cleanup
 */
export const useEventListener = () => {
  const { addCleanupTask } = useResourceCleanup();

  const addEventListener = useCallback((
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): string => {
    target.addEventListener(event, handler, options);
    
    return addCleanupTask(
      () => target.removeEventListener(event, handler, options),
      `listener_${event}_${Date.now()}`,
      'listener'
    );
  }, [addCleanupTask]);

  return { addEventListener };
};

/**
 * Hook for managing subscriptions with automatic cleanup
 */
export const useSubscription = () => {
  const { addCleanupTask } = useResourceCleanup();

  const addSubscription = useCallback((
    subscribe: () => (() => void),
    name?: string
  ): string => {
    const unsubscribe = subscribe();
    
    return addCleanupTask(
      unsubscribe,
      name ? `subscription_${name}` : undefined,
      'subscription'
    );
  }, [addCleanupTask]);

  return { addSubscription };
};