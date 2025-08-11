import { useState, useCallback, useRef, useEffect } from 'react';

export interface OptimisticUpdateConfig<T> {
  key: string;
  updateFn: (current: T) => T;
  serverUpdate: () => Promise<T>;
  rollbackDelay?: number;
  onSuccess?: (result: T) => void;
  onError?: (error: Error, rollbackValue: T) => void;
  conflictResolver?: (optimistic: T, server: T) => T;
}

export interface OptimisticState<T> {
  value: T;
  isOptimistic: boolean;
  originalValue: T;
  updateId: string;
  timestamp: number;
}

export interface PendingUpdate {
  key: string;
  updateId: string;
  promise: Promise<any>;
  rollbackTimer?: NodeJS.Timeout;
}

interface UseOptimisticUpdatesReturn {
  // Core operations
  optimisticUpdate: <T>(config: OptimisticUpdateConfig<T>) => Promise<void>;
  rollbackUpdate: (key: string, updateId?: string) => void;
  confirmUpdate: (key: string, updateId?: string) => void;
  getOptimisticValue: <T>(key: string) => T | null;
  getOptimisticState: <T>(key: string) => OptimisticState<T> | null;
  
  // State queries
  isOptimistic: (key: string) => boolean;
  isPending: (key: string) => boolean;
  hasFailed: (key: string) => boolean;
  
  // Batch operations
  batchOptimisticUpdates: <T>(updates: OptimisticUpdateConfig<T>[]) => Promise<void>;
  rollbackAllUpdates: () => void;
  
  // State management
  optimisticStates: Record<string, OptimisticState<any>>;
  pendingUpdates: Set<string>;
  failedUpdates: Set<string>;
  
  // Cleanup
  clearOptimisticState: (key: string) => void;
  clearAllOptimisticStates: () => void;
}

const DEFAULT_ROLLBACK_DELAY = 10000; // 10 seconds

export const useOptimisticUpdates = (): UseOptimisticUpdatesReturn => {
  const [optimisticStates, setOptimisticStates] = useState<Record<string, OptimisticState<any>>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [failedUpdates, setFailedUpdates] = useState<Set<string>>(new Set());
  
  const pendingUpdateRefs = useRef<Map<string, PendingUpdate>>(new Map());
  const updateCounterRef = useRef(0);

  // Generate unique update ID
  const generateUpdateId = useCallback((): string => {
    updateCounterRef.current += 1;
    return `update_${Date.now()}_${updateCounterRef.current}`;
  }, []);

  // Get current optimistic state for a key
  const getOptimisticState = useCallback(<T>(key: string): OptimisticState<T> | null => {
    return optimisticStates[key] || null;
  }, [optimisticStates]);

  // Get current optimistic value for a key
  const getOptimisticValue = useCallback(<T>(key: string): T | null => {
    const state = getOptimisticState<T>(key);
    return state ? state.value : null;
  }, [getOptimisticState]);

  // Check if a key has optimistic updates
  const isOptimistic = useCallback((key: string): boolean => {
    const state = optimisticStates[key];
    return state?.isOptimistic ?? false;
  }, [optimisticStates]);

  // Check if a key has pending updates
  const isPending = useCallback((key: string): boolean => {
    return pendingUpdates.has(key);
  }, [pendingUpdates]);

  // Check if a key has failed updates
  const hasFailed = useCallback((key: string): boolean => {
    return failedUpdates.has(key);
  }, [failedUpdates]);

  // Clear optimistic state for a key
  const clearOptimisticState = useCallback((key: string) => {
    setOptimisticStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    
    setPendingUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
    
    setFailedUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    // Clear any pending update references
    const pendingUpdate = pendingUpdateRefs.current.get(key);
    if (pendingUpdate?.rollbackTimer) {
      clearTimeout(pendingUpdate.rollbackTimer);
    }
    pendingUpdateRefs.current.delete(key);
  }, []);

  // Clear all optimistic states
  const clearAllOptimisticStates = useCallback(() => {
    setOptimisticStates({});
    setPendingUpdates(new Set());
    setFailedUpdates(new Set());
    
    // Clear all rollback timers
    pendingUpdateRefs.current.forEach(update => {
      if (update.rollbackTimer) {
        clearTimeout(update.rollbackTimer);
      }
    });
    pendingUpdateRefs.current.clear();
  }, []);

  // Rollback update to original value
  const rollbackUpdate = useCallback((key: string, updateId?: string) => {
    const currentState = optimisticStates[key];
    if (!currentState) return;

    // If updateId is specified, only rollback that specific update
    if (updateId && currentState.updateId !== updateId) return;

    setOptimisticStates(prev => ({
      ...prev,
      [key]: {
        ...currentState,
        value: currentState.originalValue,
        isOptimistic: false,
      },
    }));

    setFailedUpdates(prev => {
      const newSet = new Set(prev);
      newSet.add(key);
      return newSet;
    });

    setPendingUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    // Clear rollback timer
    const pendingUpdate = pendingUpdateRefs.current.get(key);
    if (pendingUpdate?.rollbackTimer) {
      clearTimeout(pendingUpdate.rollbackTimer);
    }
  }, [optimisticStates]);

  // Confirm update (remove optimistic flag)
  const confirmUpdate = useCallback((key: string, updateId?: string) => {
    const currentState = optimisticStates[key];
    if (!currentState) return;

    // If updateId is specified, only confirm that specific update
    if (updateId && currentState.updateId !== updateId) return;

    setOptimisticStates(prev => ({
      ...prev,
      [key]: {
        ...currentState,
        isOptimistic: false,
        originalValue: currentState.value, // Update original value to current
      },
    }));

    setPendingUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    setFailedUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    // Clear pending update reference
    const pendingUpdate = pendingUpdateRefs.current.get(key);
    if (pendingUpdate?.rollbackTimer) {
      clearTimeout(pendingUpdate.rollbackTimer);
    }
    pendingUpdateRefs.current.delete(key);
  }, [optimisticStates]);

  // Rollback all pending updates
  const rollbackAllUpdates = useCallback(() => {
    Object.keys(optimisticStates).forEach(key => {
      if (optimisticStates[key].isOptimistic) {
        rollbackUpdate(key);
      }
    });
  }, [optimisticStates, rollbackUpdate]);

  // Main optimistic update function
  const optimisticUpdate = useCallback(async <T>(config: OptimisticUpdateConfig<T>) => {
    const {
      key,
      updateFn,
      serverUpdate,
      rollbackDelay = DEFAULT_ROLLBACK_DELAY,
      onSuccess,
      onError,
      conflictResolver,
    } = config;

    const updateId = generateUpdateId();
    const currentState = optimisticStates[key];
    const currentValue = currentState?.value ?? null;

    if (currentValue === null) {
      console.warn(`OptimisticUpdate: No current value found for key "${key}". Make sure to initialize the state first.`);
      return;
    }

    // Apply optimistic update
    const optimisticValue = updateFn(currentValue);
    const newState: OptimisticState<T> = {
      value: optimisticValue,
      isOptimistic: true,
      originalValue: currentState?.originalValue ?? currentValue,
      updateId,
      timestamp: Date.now(),
    };

    setOptimisticStates(prev => ({ ...prev, [key]: newState }));
    setPendingUpdates(prev => new Set(prev).add(key));
    setFailedUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    // Setup rollback timer
    const rollbackTimer = setTimeout(() => {
      console.warn(`OptimisticUpdate: Rolling back update for "${key}" due to timeout`);
      rollbackUpdate(key, updateId);
    }, rollbackDelay);

    // Create server update promise
    const serverUpdatePromise = serverUpdate()
      .then((serverResult) => {
        // Clear rollback timer
        clearTimeout(rollbackTimer);
        
        // Handle potential conflicts
        let finalValue = serverResult;
        if (conflictResolver && optimisticValue !== serverResult) {
          finalValue = conflictResolver(optimisticValue, serverResult);
        }

        // Update with server result
        setOptimisticStates(prev => ({
          ...prev,
          [key]: {
            value: finalValue,
            isOptimistic: false,
            originalValue: finalValue,
            updateId,
            timestamp: Date.now(),
          },
        }));

        confirmUpdate(key, updateId);
        onSuccess?.(finalValue);
        
        return finalValue;
      })
      .catch((error) => {
        console.warn(`OptimisticUpdate: Server update failed for "${key}":`, error);
        
        // Clear rollback timer
        clearTimeout(rollbackTimer);
        
        // Rollback to original value
        const rollbackValue = newState.originalValue;
        rollbackUpdate(key, updateId);
        
        onError?.(error, rollbackValue);
        throw error;
      });

    // Store pending update reference
    pendingUpdateRefs.current.set(key, {
      key,
      updateId,
      promise: serverUpdatePromise,
      rollbackTimer,
    });

    return serverUpdatePromise;
  }, [
    optimisticStates,
    generateUpdateId,
    rollbackUpdate,
    confirmUpdate,
  ]);

  // Batch optimistic updates
  const batchOptimisticUpdates = useCallback(async <T>(updates: OptimisticUpdateConfig<T>[]) => {
    const promises = updates.map(config => optimisticUpdate(config));
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Batch optimistic updates had some failures:', error);
    }
  }, [optimisticUpdate]);

  // Initialize optimistic state for a key
  const initializeOptimisticState = useCallback(<T>(key: string, initialValue: T) => {
    if (!optimisticStates[key]) {
      const initialState: OptimisticState<T> = {
        value: initialValue,
        isOptimistic: false,
        originalValue: initialValue,
        updateId: generateUpdateId(),
        timestamp: Date.now(),
      };
      
      setOptimisticStates(prev => ({ ...prev, [key]: initialState }));
    }
  }, [optimisticStates, generateUpdateId]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear all timers on unmount
      pendingUpdateRefs.current.forEach(update => {
        if (update.rollbackTimer) {
          clearTimeout(update.rollbackTimer);
        }
      });
      pendingUpdateRefs.current.clear();
    };
  }, []);

  // Auto-cleanup old states (older than 5 minutes)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      setOptimisticStates(prev => {
        const newStates = { ...prev };
        let hasChanges = false;
        
        Object.keys(newStates).forEach(key => {
          const state = newStates[key];
          if (!state.isOptimistic && state.timestamp < fiveMinutesAgo) {
            delete newStates[key];
            hasChanges = true;
          }
        });
        
        return hasChanges ? newStates : prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    // Core operations
    optimisticUpdate,
    rollbackUpdate,
    confirmUpdate,
    getOptimisticValue,
    getOptimisticState,
    
    // State queries
    isOptimistic,
    isPending,
    hasFailed,
    
    // Batch operations
    batchOptimisticUpdates,
    rollbackAllUpdates,
    
    // State management
    optimisticStates,
    pendingUpdates,
    failedUpdates,
    
    // Cleanup
    clearOptimisticState,
    clearAllOptimisticStates,
  };
};