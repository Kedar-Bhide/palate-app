import NetInfo from '@react-native-community/netinfo';

export interface NetworkRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryCount?: number;
  priority?: 'high' | 'medium' | 'low';
}

export interface RequestBatch<T> {
  key: string;
  request: NetworkRequest;
  transform?: (response: Response) => Promise<T>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
}

interface RequestQueue {
  high: NetworkRequest[];
  medium: NetworkRequest[];
  low: NetworkRequest[];
}

interface ConnectionInfo {
  type: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// Global request deduplication cache
const requestCache = new Map<string, Promise<any>>();
const requestQueue: RequestQueue = { high: [], medium: [], low: [] };
let isProcessingQueue = false;

// Default configurations
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error: Error, attempt: number) => {
    // Retry on network errors, timeouts, and 5xx status codes
    if (error.message.includes('Network Error') || 
        error.message.includes('timeout') ||
        error.message.includes('5')) {
      return attempt < 3;
    }
    return false;
  },
};

const DEFAULT_TIMEOUTS: Record<string, number> = {
  wifi: 30000,
  cellular: 20000,
  '2g': 10000,
  '3g': 15000,
  '4g': 20000,
  '5g': 30000,
  unknown: 15000,
};

/**
 * Get current connection information
 */
export const getConnectionInfo = async (): Promise<ConnectionInfo> => {
  try {
    const netInfo = await NetInfo.fetch();
    return {
      type: netInfo.type,
      effectiveType: netInfo.details?.effectiveConnectionType as string,
      downlink: netInfo.details?.downlink as number,
      rtt: netInfo.details?.rtt as number,
    };
  } catch (error) {
    console.warn('Failed to get connection info:', error);
    return { type: 'unknown' };
  }
};

/**
 * Generate a cache key for request deduplication
 */
const generateRequestKey = (request: NetworkRequest): string => {
  const bodyKey = request.body ? JSON.stringify(request.body) : '';
  return `${request.method}:${request.url}:${bodyKey}`;
};

/**
 * Calculate appropriate timeout based on connection type
 */
const getTimeoutForConnection = (connectionType: string, baseTimeout?: number): number => {
  if (baseTimeout) return baseTimeout;
  return DEFAULT_TIMEOUTS[connectionType] || DEFAULT_TIMEOUTS.unknown;
};

/**
 * Calculate delay for exponential backoff
 */
const calculateBackoffDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  return Math.min(delay, config.maxDelay);
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    /5\d\d/.test(message) // 5xx status codes
  );
};

/**
 * Make HTTP request with timeout and error handling
 */
const makeRequest = async (request: NetworkRequest, connectionInfo: ConnectionInfo): Promise<Response> => {
  const timeout = getTimeoutForConnection(connectionInfo.type, request.timeout);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Deduplicate requests - return existing promise if same request is in progress
 */
export const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  // Check if request is already in progress
  const existingRequest = requestCache.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  // Make new request and cache the promise
  const requestPromise = requestFn()
    .finally(() => {
      // Remove from cache when done (success or failure)
      requestCache.delete(key);
    });

  requestCache.set(key, requestPromise);
  return requestPromise;
};

/**
 * Retry request with exponential backoff
 */
export const retryWithBackoff = async <T>(
  requestFn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt > retryConfig.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (retryConfig.retryCondition && !retryConfig.retryCondition(lastError, attempt)) {
        break;
      }

      // Default retry logic if no custom condition
      if (!retryConfig.retryCondition && !isRetryableError(lastError)) {
        break;
      }

      // Wait before retry with exponential backoff
      const delay = calculateBackoffDelay(attempt, retryConfig);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(`Retrying request (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}) after ${delay}ms`);
    }
  }

  throw lastError;
};

/**
 * Optimize request based on connection type and bandwidth
 */
export const optimizeForBandwidth = (
  request: NetworkRequest, 
  connectionInfo: ConnectionInfo
): NetworkRequest => {
  const optimizedRequest = { ...request };

  // Adjust timeout based on connection
  optimizedRequest.timeout = getTimeoutForConnection(connectionInfo.type, request.timeout);

  // Optimize for slow connections
  if (connectionInfo.type === '2g' || connectionInfo.effectiveType === 'slow-2g') {
    // Add compression headers for slow connections
    optimizedRequest.headers = {
      ...optimizedRequest.headers,
      'Accept-Encoding': 'gzip, deflate',
      'Accept': 'application/json',
    };

    // Reduce timeout for very slow connections
    optimizedRequest.timeout = Math.min(optimizedRequest.timeout || 0, 10000);
  }

  // Optimize for fast connections
  if (connectionInfo.type === 'wifi' || connectionInfo.type === '5g') {
    // Allow larger payloads and longer timeouts for fast connections
    optimizedRequest.timeout = Math.max(optimizedRequest.timeout || 0, 30000);
  }

  return optimizedRequest;
};

/**
 * Add request to priority queue
 */
export const prioritizeRequest = (request: NetworkRequest, priority: 'high' | 'medium' | 'low' = 'medium'): void => {
  request.priority = priority;
  requestQueue[priority].push(request);
  
  // Start processing queue if not already processing
  if (!isProcessingQueue) {
    processRequestQueue();
  }
};

/**
 * Process request queue by priority
 */
const processRequestQueue = async (): Promise<void> => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  const connectionInfo = await getConnectionInfo();

  try {
    // Process high priority requests first
    while (requestQueue.high.length > 0) {
      const request = requestQueue.high.shift()!;
      await executeRequest(request, connectionInfo);
    }

    // Then medium priority
    while (requestQueue.medium.length > 0) {
      const request = requestQueue.medium.shift()!;
      await executeRequest(request, connectionInfo);
    }

    // Finally low priority
    while (requestQueue.low.length > 0) {
      const request = requestQueue.low.shift()!;
      await executeRequest(request, connectionInfo);
    }
  } finally {
    isProcessingQueue = false;
  }
};

/**
 * Execute a single request with optimization
 */
const executeRequest = async (request: NetworkRequest, connectionInfo: ConnectionInfo): Promise<Response> => {
  const optimizedRequest = optimizeForBandwidth(request, connectionInfo);
  return retryWithBackoff(() => makeRequest(optimizedRequest, connectionInfo));
};

/**
 * Batch multiple requests and execute them efficiently
 */
export const batchRequests = async <T>(requests: RequestBatch<T>[]): Promise<T[]> => {
  const connectionInfo = await getConnectionInfo();
  const batchSize = getBatchSizeForConnection(connectionInfo.type);
  const results: T[] = [];

  // Process requests in batches to avoid overwhelming the network
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async ({ key, request, transform }) => {
      return deduplicateRequest(key, async () => {
        const optimizedRequest = optimizeForBandwidth(request, connectionInfo);
        const response = await retryWithBackoff(() => makeRequest(optimizedRequest, connectionInfo));
        
        if (transform) {
          return transform(response);
        }
        
        return response.json();
      });
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn(`Batch request ${i + index} failed:`, result.reason);
        // Add null or default value for failed requests
        results.push(null as any);
      }
    });

    // Small delay between batches for slow connections
    if (connectionInfo.type === '2g' && i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
};

/**
 * Get appropriate batch size based on connection type
 */
const getBatchSizeForConnection = (connectionType: string): number => {
  switch (connectionType) {
    case 'wifi':
    case '5g':
      return 8;
    case '4g':
      return 5;
    case '3g':
      return 3;
    case '2g':
      return 1;
    default:
      return 4;
  }
};

/**
 * Preload data based on connection quality
 */
export const adaptivePreload = async <T>(
  preloadFn: () => Promise<T>,
  connectionInfo: ConnectionInfo
): Promise<T | null> => {
  // Skip preloading on very slow connections
  if (connectionInfo.type === '2g' || connectionInfo.effectiveType === 'slow-2g') {
    console.log('Skipping preload due to slow connection');
    return null;
  }

  // Skip preloading if RTT is too high (indicates poor connection)
  if (connectionInfo.rtt && connectionInfo.rtt > 2000) {
    console.log('Skipping preload due to high RTT:', connectionInfo.rtt);
    return null;
  }

  try {
    // Set a shorter timeout for preloading
    const timeoutMs = connectionInfo.type === 'wifi' ? 10000 : 5000;
    
    return await Promise.race([
      preloadFn(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Preload timeout')), timeoutMs)
      ),
    ]);
  } catch (error) {
    console.log('Preload failed, continuing without:', error);
    return null;
  }
};

/**
 * Smart request timing - delay requests based on network conditions
 */
export const smartRequestTiming = async (
  requestFn: () => Promise<any>,
  connectionInfo: ConnectionInfo
): Promise<any> => {
  // Add delay for slow connections to prevent overwhelming them
  if (connectionInfo.type === '2g') {
    await new Promise(resolve => setTimeout(resolve, 1000));
  } else if (connectionInfo.type === '3g') {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return requestFn();
};

/**
 * Clear all cached requests (useful for logout or refresh)
 */
export const clearRequestCache = (): void => {
  requestCache.clear();
  requestQueue.high = [];
  requestQueue.medium = [];
  requestQueue.low = [];
};

/**
 * Get request cache statistics
 */
export const getRequestCacheStats = () => {
  return {
    activeRequests: requestCache.size,
    queuedRequests: {
      high: requestQueue.high.length,
      medium: requestQueue.medium.length,
      low: requestQueue.low.length,
    },
    isProcessingQueue,
  };
};

/**
 * Monitor network performance
 */
export class NetworkPerformanceMonitor {
  private requestTimes: number[] = [];
  private errorCount = 0;
  private successCount = 0;

  recordRequest(startTime: number, endTime: number, success: boolean) {
    const duration = endTime - startTime;
    this.requestTimes.push(duration);
    
    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }

    // Keep only last 100 requests
    if (this.requestTimes.length > 100) {
      this.requestTimes = this.requestTimes.slice(-100);
    }
  }

  getStats() {
    if (this.requestTimes.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        totalRequests: 0,
      };
    }

    const averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
    const totalRequests = this.successCount + this.errorCount;
    const successRate = totalRequests > 0 ? (this.successCount / totalRequests) * 100 : 0;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      totalRequests,
    };
  }

  reset() {
    this.requestTimes = [];
    this.errorCount = 0;
    this.successCount = 0;
  }
}

// Global performance monitor instance
export const networkMonitor = new NetworkPerformanceMonitor();